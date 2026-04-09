"""
Phase 5.2 — SSO OAuth Service
==============================
Implements real OAuth 2.0 Authorization-Code flows for Google and Azure AD.

Reads from .env:
  GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
  AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET
  FRONTEND_URL (fallback: http://localhost:3000)

Usage (from auth.py router):
    from .sso_service import SSOService, SSOProvider
    redirect_url = SSOService.get_authorization_url("google", state)
    user_info   = await SSOService.exchange_code("google", code, redirect_uri)
"""

import os
import logging
import httpx
from typing import Optional
from urllib.parse import urlencode

logger = logging.getLogger(__name__)

# ─── Configuration ─────────────────────────────────────────────────────────────
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


class SSOProvider:
    GOOGLE = "google"
    AZURE = "azure"
    SUPPORTED = {"google", "azure"}


_GOOGLE_CONFIG = {
    "client_id":     os.getenv("GOOGLE_CLIENT_ID", ""),
    "client_secret": os.getenv("GOOGLE_CLIENT_SECRET", ""),
    "auth_url":      "https://accounts.google.com/o/oauth2/v2/auth",
    "token_url":     "https://oauth2.googleapis.com/token",
    "userinfo_url":  "https://openidconnect.googleapis.com/v1/userinfo",
    "scopes":        "openid email profile",
}

_AZURE_CONFIG = {
    "client_id":     os.getenv("AZURE_CLIENT_ID", ""),
    "client_secret": os.getenv("AZURE_CLIENT_SECRET", ""),
    "tenant_id":     os.getenv("AZURE_TENANT_ID", "common"),
    "scopes":        "openid email profile User.Read",
}


def _azure_auth_url() -> str:
    tid = _AZURE_CONFIG["tenant_id"] or "common"
    return f"https://login.microsoftonline.com/{tid}/oauth2/v2.0/authorize"


def _azure_token_url() -> str:
    tid = _AZURE_CONFIG["tenant_id"] or "common"
    return f"https://login.microsoftonline.com/{tid}/oauth2/v2.0/token"


# ─── SSOService ────────────────────────────────────────────────────────────────
class SSOService:

    @staticmethod
    def get_redirect_uri(provider: str) -> str:
        """Callback URL the backend registers with the OAuth provider."""
        return f"{FRONTEND_URL}/api/auth/sso/{provider}/callback"

    @staticmethod
    def get_authorization_url(provider: str, state: str = "") -> str:
        """
        Build the OAuth consent screen URL to redirect the user to.
        Returns a fully-formed URL string.
        """
        if provider == SSOProvider.GOOGLE:
            params = {
                "client_id":     _GOOGLE_CONFIG["client_id"],
                "redirect_uri":  SSOService.get_redirect_uri(provider),
                "response_type": "code",
                "scope":         _GOOGLE_CONFIG["scopes"],
                "access_type":   "offline",
                "state":         state,
                "prompt":        "select_account",
            }
            return f"{_GOOGLE_CONFIG['auth_url']}?{urlencode(params)}"

        if provider == SSOProvider.AZURE:
            params = {
                "client_id":     _AZURE_CONFIG["client_id"],
                "redirect_uri":  SSOService.get_redirect_uri(provider),
                "response_type": "code",
                "scope":         _AZURE_CONFIG["scopes"],
                "state":         state,
                "response_mode": "query",
            }
            return f"{_azure_auth_url()}?{urlencode(params)}"

        raise ValueError(f"Unsupported SSO provider: {provider!r}")

    @staticmethod
    async def exchange_code(
        provider: str,
        code: str,
        redirect_uri: Optional[str] = None,
    ) -> dict:
        """
        Exchange an authorization code for user info.
        Returns a dict with keys: email, full_name, sso_id, avatar_url (optional).
        Raises httpx.HTTPStatusError on provider errors.
        """
        redirect_uri = redirect_uri or SSOService.get_redirect_uri(provider)

        async with httpx.AsyncClient(timeout=10.0) as client:
            if provider == SSOProvider.GOOGLE:
                return await SSOService._exchange_google(client, code, redirect_uri)
            if provider == SSOProvider.AZURE:
                return await SSOService._exchange_azure(client, code, redirect_uri)

        raise ValueError(f"Unsupported SSO provider: {provider!r}")

    # ── Google ──────────────────────────────────────────────────────────────────
    @staticmethod
    async def _exchange_google(client: httpx.AsyncClient, code: str, redirect_uri: str) -> dict:
        # 1. Token exchange
        token_resp = await client.post(
            _GOOGLE_CONFIG["token_url"],
            data={
                "code":          code,
                "client_id":     _GOOGLE_CONFIG["client_id"],
                "client_secret": _GOOGLE_CONFIG["client_secret"],
                "redirect_uri":  redirect_uri,
                "grant_type":    "authorization_code",
            },
        )
        token_resp.raise_for_status()
        tokens = token_resp.json()
        access_token = tokens.get("access_token")

        # 2. User info
        info_resp = await client.get(
            _GOOGLE_CONFIG["userinfo_url"],
            headers={"Authorization": f"Bearer {access_token}"},
        )
        info_resp.raise_for_status()
        info = info_resp.json()

        return {
            "sso_id":     info.get("sub", ""),
            "email":      info.get("email", "").lower().strip(),
            "full_name":  info.get("name", ""),
            "avatar_url": info.get("picture"),
            "provider":   SSOProvider.GOOGLE,
        }

    # ── Azure AD ────────────────────────────────────────────────────────────────
    @staticmethod
    async def _exchange_azure(client: httpx.AsyncClient, code: str, redirect_uri: str) -> dict:
        # 1. Token exchange
        token_resp = await client.post(
            _azure_token_url(),
            data={
                "code":          code,
                "client_id":     _AZURE_CONFIG["client_id"],
                "client_secret": _AZURE_CONFIG["client_secret"],
                "redirect_uri":  redirect_uri,
                "grant_type":    "authorization_code",
                "scope":         _AZURE_CONFIG["scopes"],
            },
        )
        token_resp.raise_for_status()
        tokens = token_resp.json()
        access_token = tokens.get("access_token")
        id_token_claims = SSOService._decode_jwt_payload(tokens.get("id_token", ""))

        # 2. Microsoft Graph — /me endpoint for display name + UPN
        graph_resp = await client.get(
            "https://graph.microsoft.com/v1.0/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        graph_resp.raise_for_status()
        me = graph_resp.json()

        email = (
            me.get("mail")
            or me.get("userPrincipalName", "")
            or id_token_claims.get("preferred_username", "")
        ).lower().strip()

        return {
            "sso_id":     me.get("id") or id_token_claims.get("oid", ""),
            "email":      email,
            "full_name":  me.get("displayName", ""),
            "avatar_url": None,  # Graph /me photo requires a separate call
            "provider":   SSOProvider.AZURE,
        }

    @staticmethod
    def _decode_jwt_payload(token: str) -> dict:
        """
        Decode the payload part of a JWT without signature verification
        (safe for SSO id_token claims — the provider signature is already
        verified by the token endpoint).
        """
        import base64, json as _json
        try:
            parts = token.split(".")
            if len(parts) < 2:
                return {}
            padding = 4 - len(parts[1]) % 4
            payload_b64 = parts[1] + ("=" * padding)
            return _json.loads(base64.urlsafe_b64decode(payload_b64))
        except Exception:
            return {}

    @staticmethod
    def is_configured(provider: str) -> bool:
        """Check whether the given provider has credentials in .env."""
        if provider == SSOProvider.GOOGLE:
            return bool(_GOOGLE_CONFIG["client_id"] and _GOOGLE_CONFIG["client_secret"])
        if provider == SSOProvider.AZURE:
            return bool(_AZURE_CONFIG["client_id"] and _AZURE_CONFIG["client_secret"])
        return False
