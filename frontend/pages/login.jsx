import { PERSONA_MAP } from '../config/v2_persona_map';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useRole } from '@/contexts/RoleContext';
import { useToast } from '@/components/common/Toast';
import apiClient from '@/lib/apiClient';
import { User, Mail, Lock, Briefcase, MapPin, Phone, ArrowRight, Check, Building2, Disc, Eye, EyeOff, Search, X, ChevronDown, Headphones, Crown } from 'lucide-react';
import Link from 'next/link';

// ── V2 Retail Position Config ──────────────────────────────────────
const POSITION_OPTIONS = [
    {
        value: 'TEAM_MEMBER',
        role: 'END_USER',
        label: 'Staff',
        desc: 'Asset requests, ticket submission & personal asset view',
        Icon: User,
        color: 'border-blue-500/40 bg-blue-500/5 text-blue-400',
        activeColor: 'border-blue-500 bg-blue-500/15 text-blue-300 shadow-lg shadow-blue-500/10',
        badge: 'bg-blue-500/20 text-blue-300'
    },
    {
        value: 'SUPPORT_STAFF',
        role: 'SUPPORT',
        label: 'Support Staff',
        desc: 'Ticket management, IT support workflows & group assignments',
        Icon: Headphones,
        color: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400',
        activeColor: 'border-emerald-500 bg-emerald-500/15 text-emerald-300 shadow-lg shadow-emerald-500/10',
        badge: 'bg-emerald-500/20 text-emerald-300'
    },
    {
        value: 'MANAGER',
        role: 'MANAGER',
        label: 'Manager',
        desc: 'Departmental approvals, team oversight & full request control',
        Icon: Crown,
        color: 'border-amber-500/40 bg-amber-500/5 text-amber-400',
        activeColor: 'border-amber-500 bg-amber-500/15 text-amber-300 shadow-lg shadow-amber-500/10',
        badge: 'bg-amber-500/20 text-amber-300'
    }
];


const GENERIC_PERSONAS = [
    { value: 'SENIOR_EXECUTIVE', label: 'Senior Executive' },
    { value: 'EXECUTIVE', label: 'Executive' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'ASSISTANT_MANAGER', label: 'Assistant Manager' },
    { value: 'JUNIOR_EXECUTIVE', label: 'Junior Executive' },
    { value: 'SUPPORT_LEAD', label: 'Support Lead' }
];

export default function Login() {
    const router = useRouter();
    const { login, ROLES } = useRole();
    const toast = useToast();
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    

    // Hydration Fix: Set time only on client
    useEffect(() => {
        setIsMounted(true);
        const timer = setInterval(() => {
            setCurrentTime(new Date().toISOString().split('T')[1].slice(0, 8));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleSSOCallback = async (provider, code) => {
        setIsLoading(true);
        setError('');
        try {
            const authResponse = await apiClient.ssoCallback(provider, code);
            const userData = {
                id: authResponse.user.id,
                userName: authResponse.user.full_name || authResponse.user.email.split('@')[0],
                role: authResponse.user.role,
                location: authResponse.user.location,
                email: authResponse.user.email,
                position: authResponse.user.position,
                domain: authResponse.user.domain,
                department: authResponse.user.department,
                company: authResponse.user.company,
                createdAt: authResponse.user.created_at,
                plan: authResponse.user.plan || 'STARTER'
            };
            login(userData);
            router.push('/');
        } catch (err) {
            const msg = 'SSO Authentication failed: ' + (err.message || 'Unknown error');
            setError(msg);
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSSOLogin = (provider) => {
        apiClient.ssoLogin(provider);
    };

    // Departments aligned with roles: IT (System Admin, IT Management), Finance, Procurement, Asset Management (Asset & Inventory Manager), rest for End Users
    const DEPT_DOMAIN_MAP = {
        "ADMIN": [
                "ADMIN CENTRAL",
                "ADMIN FACILITY",
                "TRAVEL DESK"
        ],
        "B&M": [
                "GM",
                "KIDS",
                "LADIES",
                "LOCATION QC/BUYER",
                "MDM",
                "MENS",
                "NT",
                "PD",
                "PO-COMM",
                "PRD-OPS",
                "SAMPLING",
                "SUPPORT DEPT"
        ],
        "BD": [
                "BUSINESS DEVELOPMENT"
        ],
        "F&A": [
                "AP COMMERCIAL",
                "AP EXPENDITURES",
                "FINANCE & ACCOUNTS",
                "PROJECT",
                "RETAIL FINANCE",
                "TAXATION"
        ],
        "HR": [
                "HR-MGMT",
                "HR-MIS",
                "L&D",
                "PAYROLL",
                "PLANNING",
                "RECRUITMENT"
        ],
        "INVENTORY": [
                "INVENTORY"
        ],
        "IT": [
                "ANDROID",
                "BASIS",
                "DATABASE",
                "DIGITAL TRANSFORM",
                "DOT.NET",
                "INFRA",
                "IT-MGMT",
                "IT-PROCUREMENT",
                "IT-SECURITY",
                "IT-SUPPORT",
                "LOVABLE",
                "PMO",
                "REACT",
                "SAP-ABAP",
                "SAP-CORE",
                "SAP-FUNCTIONAL",
                "SQL"
        ],
        "LEGAL & COMPANY SECRETARY": [
                "CORP LEGAL & CS"
        ],
        "LOSS PREVENTION": [
                "CCTV",
                "LOSS PREVENTION"
        ],
        "MARKETING": [
                "CUSTOMER SUPPORT",
                "DIGITAL MARKETING",
                "GRAPHIC DESIGNING",
                "RETAIL MARKETING"
        ],
        "NSO": [
                "NSO",
                "NSO AUDIT",
                "NSO FINANCE",
                "NSO HR",
                "NSO MARKETING",
                "NSO PLANNING",
                "NSO SCM",
                "NSO SUPPORT"
        ],
        "PLANNING": [
                "CAT PLANNING",
                "CENTRAL PLANNING",
                "PLANNING",
                "REPLENISHMENT"
        ],
        "PROJECT": [
                "AUTO CAD",
                "EXECUTION",
                "EXECUTION-PLANNING",
                "PLANNING",
                "PO PAYMENT"
        ],
        "RETAIL": [
                "RETAIL OPERATION",
                "RETAIL PLANNING",
                "RETAIL SUPPORT"
        ],
        "RETAIL OPERATION": [
                "ST-ADMIN",
                "ST-BILLING",
                "ST-FLR-OP",
                "ST-MGMT",
                "ST-SECURITY"
        ],
        "SCM": [
                "CLA",
                "DC OPS",
                "GATE ENTRY",
                "HR",
                "HUB OPS",
                "INVENTORY",
                "IT",
                "LOG OPS",
                "LP-ADMIN",
                "MHE",
                "MIS",
                "MSA",
                "NON TRADING",
                "PROJECT",
                "PUTAWAY",
                "QC",
                "RDC OPS",
                "RECEIVING",
                "SCM - MGMT"
        ]
    };

    // Retail Pulse Hierarchical Mapping (Mapped from visual references)
    const RETAIL_HIERARCHY = {
        "ADMIN": {
                "ADMIN CENTRAL": [
                        "AC TECHNICIAN"
                ],
                "ADMIN FACILITY": [
                        "ADMIN HEAD",
                        "ADMIN MANAGER",
                        "DRIVER",
                        "ELECTRICIAN",
                        "FACILITY MANAGER",
                        "HK",
                        "INTERNAL SECURITY",
                        "MIS EXECUTIVE",
                        "OFFICE BOY",
                        "RDC- HUB MANAGER",
                        "RECEPTIONIST"
                ],
                "TRAVEL DESK": [
                        "SENIOR EXECUTIVE"
                ]
        },
        "B&M": {
                "GM": [
                        "ASST DIV-HEAD",
                        "BUYER",
                        "CAT-PLANNER",
                        "DIV-HEAD",
                        "JUNIOR EXECUTIVE",
                        "PO-OFFICER",
                        "SUB-DIV",
                        "T&A"
                ],
                "KIDS": [
                        "ASST DIV-HEAD",
                        "BUYER",
                        "CAT-PLANNER",
                        "DIV-HEAD",
                        "JUNIOR EXECUTIVE",
                        "PO-OFFICER",
                        "SUB-DIV",
                        "T&A"
                ],
                "LADIES": [
                        "ASST DIV-HEAD",
                        "BUYER",
                        "CAT-PLANNER",
                        "DIV-HEAD",
                        "JUNIOR EXECUTIVE",
                        "PO-OFFICER",
                        "SUB-DIV",
                        "T&A"
                ],
                "LOCATION QC/BUYER": [
                        "LOCATION HEAD",
                        "LOCATION QC/BUYER/EDP"
                ],
                "MDM": [
                        "MDM-HEAD",
                        "MDM-JR.EXECUTIVE",
                        "MDM-SR.EXECUTIVE"
                ],
                "MENS": [
                        "ASST DIV-HEAD",
                        "BUYER",
                        "CAT-PLANNER",
                        "DIV-HEAD",
                        "JUNIOR EXECUTIVE",
                        "PO-OFFICER",
                        "SUB-DIV",
                        "T&A"
                ],
                "NT": [
                        "DIV-HEAD",
                        "JUNIOR EXECUTIVE",
                        "SUB-DIV"
                ],
                "PD": [
                        "ASST DIV-PD HEAD",
                        "JR-DZNR",
                        "PD-HEAD",
                        "SUB-DIV PD DZNR HEAD"
                ],
                "PO-COMM": [
                        "HELPER",
                        "JUNIOR EXECUTIVE",
                        "MARKET BUYER",
                        "PC-ASST HEAD",
                        "PC-HEAD",
                        "SENIOR EXECUTIVE"
                ],
                "PRD-OPS": [
                        "CAD-JR.EXECUTIVE",
                        "CAD-PATTERN MASTER",
                        "FAB-DIV-HEAD",
                        "FAB-HEAD",
                        "FAB-JR.EXECUTIVE",
                        "MERCHANT",
                        "OB JR.EXECUTIVE",
                        "OB-HEAD",
                        "PATTERN MASTER",
                        "PRD-HEAD",
                        "QC-DIV HEAD",
                        "QC-HEAD"
                ],
                "SAMPLING": [
                        "JUNIOR EXECUTIVE",
                        "SAMPLING HEAD",
                        "SENIOR EXECUTIVE",
                        "TAILOR"
                ],
                "SUPPORT DEPT": [
                        "DEPT HEAD"
                ]
        },
        "BD": {
                "BUSINESS DEVELOPMENT": [
                        "ASSISTANT BD HEAD",
                        "BD HEAD",
                        "EXECUTIVE",
                        "REGIONAL MANAGER"
                ]
        },
        "F&A": {
                "AP COMMERCIAL": [
                        "ASSISTANT MANAGER",
                        "EXECUTIVE",
                        "SENIOR EXECUTIVE"
                ],
                "AP EXPENDITURES": [
                        "ASSISTANT MANAGER",
                        "EXECUTIVE",
                        "SENIOR EXECUTIVE"
                ],
                "FINANCE & ACCOUNTS": [
                        "CFO",
                        "DGM",
                        "EXECUTIVE",
                        "MANAGER"
                ],
                "PROJECT": [
                        "ASSISTANT MANAGER"
                ],
                "RETAIL FINANCE": [
                        "ASSISTANT MANAGER",
                        "JUNIOR EXECUTIVE",
                        "SENIOR EXECUTIVE"
                ],
                "TAXATION": [
                        "ASSISTANT MANAGER",
                        "MANAGER",
                        "SENIOR EXECUTIVE"
                ]
        },
        "HR": {
                "HR-MGMT": [
                        "ASSISTANT HR HEAD",
                        "HR HEAD"
                ],
                "HR-MIS": [
                        "EXECUTIVE",
                        "SENIOR EXECUTIVE"
                ],
                "L&D": [
                        "TRAINER"
                ],
                "PAYROLL": [
                        "ASSISTANT MANAGER",
                        "EXECUTIVE",
                        "MANAGER",
                        "SENIOR EXECUTIVE"
                ],
                "PLANNING": [
                        "EXECUTIVE",
                        "SENIOR EXECUTIVE"
                ],
                "RECRUITMENT": [
                        "EXECUTIVE",
                        "MANAGER",
                        "SENIOR EXECUTIVE"
                ]
        },
        "INVENTORY": {
                "INVENTORY": [
                        "ASSISTANT MANAGER",
                        "EXECUTIVE",
                        "JUNIOR EXECUTIVE",
                        "MANAGER",
                        "SENIOR EXECUTIVE"
                ]
        },
        "IT": {
                "ANDROID": [
                        "DEVELOPER"
                ],
                "BASIS": [
                        "BASIS HEAD",
                        "SENIOR EXECUTIVE"
                ],
                "DATABASE": [
                        "DBA"
                ],
                "DIGITAL TRANSFORM": [
                        "AI ENGINEER",
                        "ANALYTICS LEAD",
                        "DIGITAL TRANSFORMATION -HEAD",
                        "DT ASSISTANT"
                ],
                "DOT.NET": [
                        "DEVELOPER"
                ],
                "INFRA": [
                        "EXECUTIVE",
                        "INFRA HEAD",
                        "SENIOR EXECUTIVE"
                ],
                "IT-MGMT": [
                        "ASSISTANT HEAD ERP APPS-NON-SAP",
                        "CIO",
                        "EA TO CIO",
                        "EA TO HEAD ERP APPS - SAP",
                        "HEAD ERP APPS - SAP",
                        "HEAD ERP APPS-NON-SAP"
                ],
                "IT-PROCUREMENT": [
                        "HEAD IT PROCUREMENT & NEGOTIATIONS",
                        "PROCUREMENT ASSISTANT"
                ],
                "IT-SECURITY": [
                        "HEAD IT SECURITY & COMPLIANCE",
                        "SECURITY ENGINEER"
                ],
                "IT-SUPPORT": [
                        "AXAPTA-SUPPORT MANAGER",
                        "EXECUTIVE",
                        "HEAD-IT SUPPORT",
                        "NSO-IT SUPPORT EXECUTIVE"
                ],
                "LOVABLE": [
                        "DEVELOPER"
                ],
                "PMO": [
                        "HEAD PMO",
                        "PM-NON SAP",
                        "PM-SAP",
                        "PMO-MT"
                ],
                "REACT": [
                        "DEVELOPER"
                ],
                "SAP-ABAP": [
                        "ABAP-LEAD",
                        "ABAPER"
                ],
                "SAP-CORE": [
                        "JUNIOR EXECUTIVE",
                        "MANAGEMENT TRAINEE",
                        "SENIOR EXECUTIVE"
                ],
                "SAP-FUNCTIONAL": [
                        "FICO-FUNCTIONAL",
                        "MM-FUNCTIONAL",
                        "PS-FUNCTIONAL",
                        "WM-FUNCTIONAL"
                ],
                "SQL": [
                        "DATA ANALYST",
                        "DEVELOPER"
                ]
        },
        "LEGAL & COMPANY SECRETARY": {
                "CORP LEGAL & CS": [
                        "ASSISTANT MANAGER",
                        "ASST. CS",
                        "HEAD CS"
                ]
        },
        "LOSS PREVENTION": {
                "CCTV": [
                        "CCTV HEAD",
                        "CCTV TECHNICIAN",
                        "EXECUTIVE"
                ],
                "LOSS PREVENTION": [
                        "ASSISTANT MANAGER",
                        "CLUSTER-LP",
                        "MANAGER",
                        "MIS EXECUTIVE",
                        "REGIONAL-LP",
                        "ZONAL-LP"
                ]
        },
        "MARKETING": {
                "CUSTOMER SUPPORT": [
                        "CUSTOMER CARE EXECUTIVE",
                        "JUNIOR EXECUTIVE"
                ],
                "DIGITAL MARKETING": [
                        "MANAGEMENT TRAINEE"
                ],
                "GRAPHIC DESIGNING": [
                        "GRAPHIC DESIGNER"
                ],
                "RETAIL MARKETING": [
                        "EXECUTIVE",
                        "MANAGEMENT TRAINEE",
                        "NSO VERTICAL HEAD",
                        "SENIOR EXECUTIVE"
                ]
        },
        "NSO": {
                "NSO": [
                        "ASSISTANT NSO HEAD",
                        "NSO HEAD"
                ],
                "NSO AUDIT": [
                        "CLUSTER-LP",
                        "NSO AUDIT HEAD"
                ],
                "NSO FINANCE": [
                        "EXECUTIVE",
                        "NSO FINANCE HEAD"
                ],
                "NSO HR": [
                        "CLUSTER MANAGER",
                        "EXECUTIVE",
                        "HR MANAGER",
                        "NSO HR HEAD"
                ],
                "NSO MARKETING": [
                        "EXECUTIVE",
                        "NSO MARKETING HEAD"
                ],
                "NSO PLANNING": [
                        "EXECUTIVE",
                        "NSO PLANNING HEAD"
                ],
                "NSO SCM": [
                        "EXECUTIVE",
                        "NSO SCM HEAD"
                ],
                "NSO SUPPORT": [
                        "EXECUTIVE",
                        "MANAGER",
                        "NSO SUPPORT HEAD",
                        "REGIONAL MANAGER"
                ]
        },
        "PLANNING": {
                "CAT PLANNING": [
                        "ASSISTANT MANAGER",
                        "EXECUTIVE",
                        "MANAGER",
                        "SENIOR EXECUTIVE"
                ],
                "CENTRAL PLANNING": [
                        "ASSISTANT MANAGER",
                        "EXECUTIVE",
                        "MANAGER",
                        "SENIOR EXECUTIVE"
                ],
                "PLANNING": [
                        "MANAGER"
                ],
                "REPLENISHMENT": [
                        "ASSISTANT MANAGER",
                        "EXECUTIVE",
                        "MANAGER",
                        "SENIOR EXECUTIVE"
                ]
        },
        "PROJECT": {
                "AUTO CAD": [
                        "EXECUTIVE",
                        "SENIOR EXECUTIVE"
                ],
                "EXECUTION": [
                        "ASSISTANT MANAGER",
                        "ASSISTANT PROJECT HEAD",
                        "MANAGER",
                        "MIS EXECUTIVE",
                        "SENIOR EXECUTIVE",
                        "SENIOR MANAGER",
                        "SUPERVISOR"
                ],
                "EXECUTION-PLANNING": [
                        "PROJECT HEAD"
                ],
                "PLANNING": [
                        "EXECUTIVE",
                        "MANAGER",
                        "SENIOR MANAGER"
                ],
                "PO PAYMENT": [
                        "EXECUTIVE",
                        "SENIOR EXECUTIVE"
                ]
        },
        "RETAIL": {
                "RETAIL OPERATION": [
                        "ASSISTANT TO RETAIL HEAD",
                        "ASSISTANT ZONAL MANAGER",
                        "CLUSTER MANAGER",
                        "MIS EXECUTIVE",
                        "REGIONAL MANAGER",
                        "RETAIL HEAD",
                        "ZONAL MANAGER"
                ],
                "RETAIL PLANNING": [
                        "ASSISTANT RETAIL PLANNING HEAD",
                        "CLUSTER PLANNER",
                        "REGIONAL PLANNER",
                        "RETAIL PLANNING HEAD",
                        "ZONAL PLANNER"
                ],
                "RETAIL SUPPORT": [
                        "ASSISTANT TO ZONAL SUPPORT HEAD",
                        "ZONAL SUPPORT HEAD"
                ]
        },
        "RETAIL OPERATION": {
                "ST-ADMIN": [
                        "HK"
                ],
                "ST-BILLING": [
                        "CASHIER",
                        "CUSTOMER RETURN"
                ],
                "ST-FLR-OP": [
                        "FM",
                        "LOBM",
                        "NAPS LOBM",
                        "TINNY/WINNY-LOBM"
                ],
                "ST-MGMT": [
                        "ASM",
                        "BENCH ASM",
                        "BENCH SM",
                        "LP",
                        "SM"
                ],
        "ST-SECURITY": [
            "ELECTRICIAN",
            "INTERNAL SECURITY",
            "SECURITY GUARD"
        ]
        },
        "SCM": {
                "CLA": [
                        "ASST. DEPT. HEAD",
                        "DEPT HEAD",
                        "DRIVER",
                        "DRIVER HELPER",
                        "EXECUTIVE",
                        "MANAGEMENT TRAINEE",
                        "SENIOR EXECUTIVE",
                        "TL"
                ],
                "DC OPS": [
                        "ASST.DC HEAD",
                        "DC HEAD"
                ],
                "GATE ENTRY": [
                        "ASST. DEPT. HEAD",
                        "DEPT HEAD",
                        "EXECUTIVE",
                        "MANAGEMENT TRAINEE",
                        "TL"
                ],
                "HR": [
                        "ASST. DEPT. HEAD",
                        "DEPT HEAD"
                ],
                "HUB OPS": [
                        "DRIVER",
                        "EXECUTIVE",
                        "HUB INCHARGE",
                        "HUB-CORDINATOR",
                        "LP",
                        "MANAGER",
                        "SENIOR EXECUTIVE",
                        "SUPERVISOR"
                ],
                "INVENTORY": [
                        "ASST. DEPT. HEAD",
                        "DEPT HEAD",
                        "TL"
                ],
                "IT": [
                        "DEPT HEAD",
                        "EXECUTIVE",
                        "TL"
                ],
                "LOG OPS": [
                        "ASSISTANT MANAGER",
                        "EXECUTIVE",
                        "MANAGER",
                        "SENIOR EXECUTIVE",
                        "TRANSPORT MANAGER"
                ],
                "LP-ADMIN": [
                        "ASST. DEPT. HEAD",
                        "DEPT HEAD",
                        "ELECTRICIAN",
                        "EXECUTIVE",
                        "INTERNAL",
                        "LADY GUARD",
                        "LP",
                        "RLPO",
                        "SENIOR LPO",
                        "TL"
                ],
                "MHE": [
                        "DEPT HEAD",
                        "OPTR",
                        "TL"
                ],
                "MIS": [
                        "DEPT HEAD"
                ],
                "MSA": [
                        "ASST. DEPT. HEAD",
                        "DEPT HEAD",
                        "EXECUTIVE",
                        "MANAGEMENT TRAINEE",
                        "TL"
                ],
                "NON TRADING": [
                        "ASST. DEPT. HEAD",
                        "DEPT HEAD",
                        "DIV-HEAD",
                        "TL"
                ],
                "PROJECT": [
                        "DEPT HEAD"
                ],
                "PUTAWAY": [
                        "ASST. DEPT. HEAD",
                        "DEPT HEAD",
                        "EXECUTIVE",
                        "TL"
                ],
                "QC": [
                        "ASST. DEPT. HEAD",
                        "DEPT HEAD",
                        "TL"
                ],
                "RDC OPS": [
                        "EXECUTIVE",
                        "MANAGEMENT TRAINEE",
                        "MANAGER",
                        "SENIOR EXECUTIVE"
                ],
                "RECEIVING": [
                        "ASST. DEPT. HEAD",
                        "DEPT HEAD",
                        "DIV-HEAD",
                        "TL"
                ],
                "SCM - MGMT": [
                        "SCM HEAD"
                ]
        }
    };

    const DEPARTMENTS = Object.keys(DEPT_DOMAIN_MAP);

    const LOC_CODES = [
        "DB03", "DB05", "DH24", "DJ02", "DK02", "DM01", "DM02", "DN01", "DN02", "DO01", "DO02", "DP01", "DR01", "DU05", "DU06", "DW01", "DW02", "DX01", "HA10", "HA11", "HA12", "HA13", "HB05", "HB06", "HB07", "HB08", "HB09", "HB10", "HB11", "HB13", "HB15", "HB16", "HB17", "HB19", "HB20", "HB21", "HB22", "HB24", "HB26", "HB29", "HB30", "HB31", "HB32", "HB34", "HB35", "HB36", "HB37", "HB38", "HB39", "HB41", "HB42", "HB43", "HB44", "HB45", "HB46", "HB47", "HB48", "HB50", "HB51", "HB52", "HB53", "HB54", "HB55", "HB56", "HB57", "HB58", "HB59", "HB60", "HB61", "HB62", "HB63", "HB64", "HB65", "HB66", "HB67", "HB68", "HC01", "HC02", "HC03", "HC04", "HC05", "HC06", "HC08", "HC09", "HD22", "HD24", "HD25", "HD26", "HD27", "HD28", "HD29", "HD30", "HD31", "HD32", "HD33", "HF01", "HG10", "HG11", "HG12", "HG13", "HH13", "HH14", "HH15", "HH16", "HH17", "HH18", "HH19", "HH20", "HH21", "HI05", "HI06", "HI07", "HI08", "HJ08", "HJ09", "HJ10", "HJ11", "HJ12", "HJ14", "HJ15", "HJ17", "HJ19", "HJ20", "HJ21", "HJ22", "HJ23", "HJ24", "HJ25", "HJ26", "HJ27", "HJ28", "HJ29", "HJ30", "HJ31", "HK04", "HK07", "HK10", "HK11", "HK12", "HK13", "HK14", "HK15", "HK16", "HK17", "HK18", "HK19", "HK20", "HK21", "HK22", "HK23", "HK24", "HK25", "HK26", "HK27", "HK28", "HK30", "HL01", "HL02", "HL03", "HL04", "HL05", "HL06", "HL07", "HL08", "HL09", "HL10", "HL11", "HM21", "HM22", "HM23", "HM24", "HM25", "HM26", "HM28", "HM29", "HM30", "HM31", "HM32", "HM33", "HM35", "HM36", "HM37", "HM38", "HM39", "HM40", "HM41", "HM42", "HM44", "HM45", "HM46", "HM47", "HM48", "HM49", "HM50", "HM51", "HM52", "HM53", "HM54", "HN10", "HN11", "HN13", "HN14", "HN15", "HN21", "HN22", "HN23", "HN25", "HN26", "HN27", "HN28", "HN29", "HN30", "HN31", "HN33", "HN34", "HN35", "HN36", "HN37", "HN38", "HN39", "HN40", "HN41", "HN42", "HN43", "HN44", "HN45", "HN46", "HN47", "HN48", "HN49", "HN50", "HN60", "HN61", "HN62", "HN80", "HO08", "HO09", "HO10", "HO11", "HO12", "HO13", "HO15", "HO16", "HO18", "HO19", "HO20", "HO21", "HO23", "HO24", "HO25", "HO26", "HO27", "HO28", "HO29", "HO30", "HO31", "HO32", "HO36", "HO37", "HO38", "HO39", "HO40", "HO41", "HO42", "HO43", "HO44", "HO45", "HO46", "HO47", "HO48", "HO49", "HO51", "HP01", "HP02", "HP03", "HP04", "HP05", "HP06", "HP07", "HP08", "HP09", "HP10", "HP11", "HP12", "HP13", "HP14", "HP17", "HP18", "HP19", "HP20", "HP21", "HP22", "HP23", "HR17", "HR18", "HR19", "HR20", "HR22", "HR23", "HR24", "HR25", "HR26", "HR27", "HR28", "HR29", "HS01", "HS02", "HS03", "HS04", "HS05", "HS06", "HS07", "HT14", "HT16", "HT17", "HT18", "HT19", "HT20", "HT21", "HT22", "HT23", "HT24", "HU34", "HU36", "HU41", "HU44", "HU45", "HU48", "HU49", "HU54", "HU55", "HU57", "HU58", "HU59", "HU61", "HU64", "HU65", "HU67", "HU69", "HU70", "HU71", "HU72", "HU74", "HU76", "HU78", "HU80", "HU81", "HU82", "HU83", "HU84", "HU86", "HU87", "HU88", "HU89", "HU90", "HU91", "HU92", "HU93", "HU94", "HU95", "HU96", "HU97", "HU98", "HU99", "HV01", "HW13", "HW14", "HW15", "HW16", "HW17", "HW18", "HW19", "HW20", "HW21", "HW24", "HW25", "HW26", "HW27", "HW29", "HW31", "HW32", "HW33", "HW34", "HW35", "HW36", "HW37", "HW42", "HX10", "HX11", "HX12", "HX13", "HX14", "HX15", "HX16", "HX17", "HX19", "HX20", "HX50", "HX51", "HX52", "HX53", "HY01", "HY02", "RDC-K", "RDC-W", "RH01", "RH02", "U100", "U101", "U102", "U103", "U104", "U105", "U106", "U107", "U108", "U111", "U112", "U113", "U114", "U115", "U116", "U117", "U119", "U120", "U121", "U122", "U124", "U125", "U126", "U127", "U128", "U129"
    ];

    const LOC_TYPES = [
        "CENTRAL", "DC", "HUB", "KOLKATA DC", "OFFICE-NEW", "STORE"
    ];

    const LOCATION_TYPE_MAP = {
        "DB03": "HUB",
        "DB05": "HUB",
        "DH24": "DC",
        "DJ02": "HUB",
        "DK02": "HUB",
        "DM01": "HUB",
        "DM02": "HUB",
        "DN01": "HUB",
        "DN02": "HUB",
        "DO01": "HUB",
        "DO02": "HUB",
        "DP01": "HUB",
        "DR01": "HUB",
        "DU05": "HUB",
        "DU06": "HUB",
        "DW01": "DC",
        "DW02": "HUB",
        "DX01": "HUB",
        "HA10": "STORE",
        "HA11": "STORE",
        "HA12": "STORE",
        "HA13": "STORE",
        "HB05": "STORE",
        "HB06": "STORE",
        "HB07": "STORE",
        "HB08": "STORE",
        "HB09": "STORE",
        "HB10": "STORE",
        "HB11": "STORE",
        "HB13": "STORE",
        "HB15": "STORE",
        "HB16": "STORE",
        "HB17": "STORE",
        "HB19": "STORE",
        "HB20": "STORE",
        "HB21": "STORE",
        "HB22": "STORE",
        "HB24": "STORE",
        "HB26": "STORE",
        "HB29": "STORE",
        "HB30": "STORE",
        "HB31": "STORE",
        "HB32": "STORE",
        "HB34": "STORE",
        "HB35": "STORE",
        "HB36": "STORE",
        "HB37": "STORE",
        "HB38": "STORE",
        "HB39": "STORE",
        "HB41": "STORE",
        "HB42": "STORE",
        "HB43": "STORE",
        "HB44": "STORE",
        "HB45": "STORE",
        "HB46": "STORE",
        "HB47": "STORE",
        "HB48": "STORE",
        "HB50": "STORE",
        "HB51": "STORE",
        "HB52": "STORE",
        "HB53": "STORE",
        "HB54": "STORE",
        "HB55": "STORE",
        "HB56": "STORE",
        "HB57": "STORE",
        "HB58": "STORE",
        "HB59": "STORE",
        "HB60": "STORE",
        "HB61": "STORE",
        "HB62": "STORE",
        "HB63": "STORE",
        "HB64": "STORE",
        "HB65": "STORE",
        "HB66": "STORE",
        "HB67": "STORE",
        "HB68": "STORE",
        "HC01": "STORE",
        "HC02": "STORE",
        "HC03": "STORE",
        "HC04": "STORE",
        "HC05": "STORE",
        "HC06": "STORE",
        "HC08": "STORE",
        "HC09": "STORE",
        "HD22": "STORE",
        "HD24": "STORE",
        "HD25": "STORE",
        "HD26": "STORE",
        "HD27": "STORE",
        "HD28": "STORE",
        "HD29": "STORE",
        "HD30": "STORE",
        "HD31": "STORE",
        "HD32": "STORE",
        "HD33": "STORE",
        "HF01": "STORE",
        "HG10": "STORE",
        "HG11": "STORE",
        "HG12": "STORE",
        "HG13": "STORE",
        "HH13": "STORE",
        "HH14": "STORE",
        "HH15": "STORE",
        "HH16": "STORE",
        "HH17": "STORE",
        "HH18": "STORE",
        "HH19": "STORE",
        "HH20": "STORE",
        "HH21": "STORE",
        "HI05": "STORE",
        "HI06": "STORE",
        "HI07": "STORE",
        "HI08": "STORE",
        "HJ08": "STORE",
        "HJ09": "STORE",
        "HJ10": "STORE",
        "HJ11": "STORE",
        "HJ12": "STORE",
        "HJ14": "STORE",
        "HJ15": "STORE",
        "HJ17": "STORE",
        "HJ19": "STORE",
        "HJ20": "STORE",
        "HJ21": "STORE",
        "HJ22": "STORE",
        "HJ23": "STORE",
        "HJ24": "STORE",
        "HJ25": "STORE",
        "HJ26": "STORE",
        "HJ27": "STORE",
        "HJ28": "STORE",
        "HJ29": "STORE",
        "HJ30": "STORE",
        "HJ31": "STORE",
        "HK04": "STORE",
        "HK07": "STORE",
        "HK10": "STORE",
        "HK11": "STORE",
        "HK12": "STORE",
        "HK13": "STORE",
        "HK14": "STORE",
        "HK15": "STORE",
        "HK16": "STORE",
        "HK17": "STORE",
        "HK18": "STORE",
        "HK19": "STORE",
        "HK20": "STORE",
        "HK21": "STORE",
        "HK22": "STORE",
        "HK23": "STORE",
        "HK24": "STORE",
        "HK25": "STORE",
        "HK26": "STORE",
        "HK27": "STORE",
        "HK28": "STORE",
        "HK30": "STORE",
        "HL01": "STORE",
        "HL02": "STORE",
        "HL03": "STORE",
        "HL04": "STORE",
        "HL05": "STORE",
        "HL06": "STORE",
        "HL07": "STORE",
        "HL08": "STORE",
        "HL09": "STORE",
        "HL10": "STORE",
        "HL11": "STORE",
        "HM21": "STORE",
        "HM22": "STORE",
        "HM23": "STORE",
        "HM24": "STORE",
        "HM25": "STORE",
        "HM26": "STORE",
        "HM28": "STORE",
        "HM29": "STORE",
        "HM30": "STORE",
        "HM31": "STORE",
        "HM32": "STORE",
        "HM33": "STORE",
        "HM35": "STORE",
        "HM36": "STORE",
        "HM37": "STORE",
        "HM38": "STORE",
        "HM39": "STORE",
        "HM40": "STORE",
        "HM41": "STORE",
        "HM42": "STORE",
        "HM44": "STORE",
        "HM45": "STORE",
        "HM46": "STORE",
        "HM47": "STORE",
        "HM48": "STORE",
        "HM49": "STORE",
        "HM50": "STORE",
        "HM51": "STORE",
        "HM52": "STORE",
        "HM53": "STORE",
        "HM54": "STORE",
        "HN10": "STORE",
        "HN11": "STORE",
        "HN13": "STORE",
        "HN14": "STORE",
        "HN15": "STORE",
        "HN21": "STORE",
        "HN22": "STORE",
        "HN23": "STORE",
        "HN25": "STORE",
        "HN26": "STORE",
        "HN27": "STORE",
        "HN28": "STORE",
        "HN29": "STORE",
        "HN30": "STORE",
        "HN31": "STORE",
        "HN33": "STORE",
        "HN34": "STORE",
        "HN35": "STORE",
        "HN36": "STORE",
        "HN37": "STORE",
        "HN38": "STORE",
        "HN39": "STORE",
        "HN40": "STORE",
        "HN41": "STORE",
        "HN42": "STORE",
        "HN43": "STORE",
        "HN44": "STORE",
        "HN45": "STORE",
        "HN46": "STORE",
        "HN47": "STORE",
        "HN48": "STORE",
        "HN49": "STORE",
        "HN50": "STORE",
        "HN60": "STORE",
        "HN61": "STORE",
        "HN62": "STORE",
        "HN80": "STORE",
        "HO08": "STORE",
        "HO09": "STORE",
        "HO10": "STORE",
        "HO11": "STORE",
        "HO12": "STORE",
        "HO13": "STORE",
        "HO15": "STORE",
        "HO16": "STORE",
        "HO18": "STORE",
        "HO19": "STORE",
        "HO20": "STORE",
        "HO21": "STORE",
        "HO23": "STORE",
        "HO24": "STORE",
        "HO25": "STORE",
        "HO26": "STORE",
        "HO27": "STORE",
        "HO28": "STORE",
        "HO29": "STORE",
        "HO30": "STORE",
        "HO31": "STORE",
        "HO32": "STORE",
        "HO36": "STORE",
        "HO37": "STORE",
        "HO38": "STORE",
        "HO39": "STORE",
        "HO40": "STORE",
        "HO41": "STORE",
        "HO42": "STORE",
        "HO43": "STORE",
        "HO44": "STORE",
        "HO45": "STORE",
        "HO46": "STORE",
        "HO47": "STORE",
        "HO48": "STORE",
        "HO49": "STORE",
        "HO51": "STORE",
        "HP01": "STORE",
        "HP02": "STORE",
        "HP03": "STORE",
        "HP04": "STORE",
        "HP05": "STORE",
        "HP06": "STORE",
        "HP07": "STORE",
        "HP08": "STORE",
        "HP09": "STORE",
        "HP10": "STORE",
        "HP11": "STORE",
        "HP12": "STORE",
        "HP13": "STORE",
        "HP14": "STORE",
        "HP17": "STORE",
        "HP18": "STORE",
        "HP19": "STORE",
        "HP20": "STORE",
        "HP21": "STORE",
        "HP22": "STORE",
        "HP23": "STORE",
        "HR17": "STORE",
        "HR18": "STORE",
        "HR19": "STORE",
        "HR20": "STORE",
        "HR22": "STORE",
        "HR23": "STORE",
        "HR24": "STORE",
        "HR25": "STORE",
        "HR26": "STORE",
        "HR27": "STORE",
        "HR28": "STORE",
        "HR29": "STORE",
        "HS01": "STORE",
        "HS02": "STORE",
        "HS03": "STORE",
        "HS04": "STORE",
        "HS05": "STORE",
        "HS06": "STORE",
        "HS07": "STORE",
        "HT14": "STORE",
        "HT16": "STORE",
        "HT17": "STORE",
        "HT18": "STORE",
        "HT19": "STORE",
        "HT20": "STORE",
        "HT21": "STORE",
        "HT22": "STORE",
        "HT23": "STORE",
        "HT24": "STORE",
        "HU34": "STORE",
        "HU36": "STORE",
        "HU41": "STORE",
        "HU44": "STORE",
        "HU45": "STORE",
        "HU48": "STORE",
        "HU49": "STORE",
        "HU54": "STORE",
        "HU55": "STORE",
        "HU57": "STORE",
        "HU58": "STORE",
        "HU59": "STORE",
        "HU61": "STORE",
        "HU64": "STORE",
        "HU65": "STORE",
        "HU67": "STORE",
        "HU69": "STORE",
        "HU70": "STORE",
        "HU71": "STORE",
        "HU72": "STORE",
        "HU74": "STORE",
        "HU76": "STORE",
        "HU78": "STORE",
        "HU80": "STORE",
        "HU81": "STORE",
        "HU82": "STORE",
        "HU83": "STORE",
        "HU84": "STORE",
        "HU86": "STORE",
        "HU87": "STORE",
        "HU88": "STORE",
        "HU89": "STORE",
        "HU90": "STORE",
        "HU91": "STORE",
        "HU92": "STORE",
        "HU93": "STORE",
        "HU94": "STORE",
        "HU95": "STORE",
        "HU96": "STORE",
        "HU97": "STORE",
        "HU98": "STORE",
        "HU99": "STORE",
        "HV01": "STORE",
        "HW13": "STORE",
        "HW14": "STORE",
        "HW15": "STORE",
        "HW16": "STORE",
        "HW17": "STORE",
        "HW18": "STORE",
        "HW19": "STORE",
        "HW20": "STORE",
        "HW21": "STORE",
        "HW24": "STORE",
        "HW25": "STORE",
        "HW26": "STORE",
        "HW27": "STORE",
        "HW29": "STORE",
        "HW31": "STORE",
        "HW32": "STORE",
        "HW33": "STORE",
        "HW34": "STORE",
        "HW35": "STORE",
        "HW36": "STORE",
        "HW37": "STORE",
        "HW42": "STORE",
        "HX10": "STORE",
        "HX11": "STORE",
        "HX12": "STORE",
        "HX13": "STORE",
        "HX14": "STORE",
        "HX15": "STORE",
        "HX16": "STORE",
        "HX17": "STORE",
        "HX19": "STORE",
        "HX20": "STORE",
        "HX50": "STORE",
        "HX51": "STORE",
        "HX52": "STORE",
        "HX53": "STORE",
        "HY01": "STORE",
        "HY02": "STORE",
        "RDC-K": "KOLKATA DC",
        "RDC-W": "nan",
        "RH01": "OFFICE-NEW",
        "RH02": "CENTRAL",
        "U100": "STORE",
        "U101": "STORE",
        "U102": "STORE",
        "U103": "STORE",
        "U104": "STORE",
        "U105": "STORE",
        "U106": "STORE",
        "U107": "STORE",
        "U108": "STORE",
        "U111": "STORE",
        "U112": "STORE",
        "U113": "STORE",
        "U114": "STORE",
        "U115": "STORE",
        "U116": "STORE",
        "U117": "STORE",
        "U119": "STORE",
        "U120": "STORE",
        "U121": "STORE",
        "U122": "STORE",
        "U124": "STORE",
        "U125": "STORE",
        "U126": "STORE",
        "U127": "STORE",
        "U128": "STORE",
        "U129": "STORE"
    };

    // Role Slider Mapping → default department
    const ROLE_DEFAULT_DEPARTMENT = {
        'ADMIN': 'IT',
        'MANAGER': 'Executive',
        'SUPPORT': 'IT',
        'END_USER': 'Engineering'
    };

    // Form States
    const [formData, setFormData] = useState({
        name: '',
        company: '', // NEW: Company Name
        email: '',
        password: '',
        confirmPassword: '',
        role: 'End User',
        domain: 'Software Development', // First domain of default department
        location: '', // LOC
        loc_type: '', // LOC-TYPE
        department: '', // DEPT
        sub_dept: '', // SUB_DEPT
        designation: '', // DESIGNATION
        persona: '', // Functional Persona
        protocol_id: '', // Staff ID
        phone: '',
        isManager: false,
        position: 'TEAM_MEMBER',
    });

    // Custom Dropdown & Telemetry States
    const [locSearch, setLocSearch] = useState('');
    const [isLocDropdownOpen, setIsLocDropdownOpen] = useState(false);
    const locDropdownRef = useRef(null);

    // Functional Persona Search State
    const [personaSearch, setPersonaSearch] = useState('');
    const [isPersonaDropdownOpen, setIsPersonaDropdownOpen] = useState(false);
    const personaDropdownRef = useRef(null);
    
    const [currentTime, setCurrentTime] = useState('00:00:00');
    const [isMounted, setIsMounted] = useState(false);

    // SSO Callback Effect
    useEffect(() => {
        const { provider, code } = router.query;
        if (code && provider) {
            handleSSOCallback(provider, code);
        }
    }, [router.query]);

    // Click outside listener for searchable dropdowns
    useEffect(() => {
        function handleClickOutside(event) {
            if (locDropdownRef.current && !locDropdownRef.current.contains(event.target)) {
                setIsLocDropdownOpen(false);
            }
            if (personaDropdownRef.current && !personaDropdownRef.current.contains(event.target)) {
                setIsPersonaDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [locDropdownRef, personaDropdownRef]);

    const filteredPersonas = useMemo(() => {
        const list = PERSONA_MAP[formData.department] || GENERIC_PERSONAS;
        if (!personaSearch) return list;
        return list.filter(p => 
            p.label.toLowerCase().includes(personaSearch.toLowerCase()) ||
            p.value.toLowerCase().includes(personaSearch.toLowerCase())
        );
    }, [formData.department, personaSearch]);

    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        let next = { ...formData, [name]: value };
        
        // Logical resets for hierarchical fields
        if (name === 'department') {
            next.sub_dept = '';
            next.designation = '';
            // Auto-sync domain if department has presets
            const domains = DEPT_DOMAIN_MAP[value];
            if (domains && domains[0]) {
                next.domain = domains[0];
            }
        } else if (name === 'sub_dept') {
            next.designation = '';
        } else if (name === 'role') {
            const roleSlug = ROLES.find(r => r.label === value)?.slug;
            if (roleSlug && ROLE_DEFAULT_DEPARTMENT[roleSlug]) {
                next.department = ROLE_DEFAULT_DEPARTMENT[roleSlug];
                const domains = DEPT_DOMAIN_MAP[next.department];
                next.domain = domains && domains[0] ? domains[0] : next.domain;
            }
            // Auto-sync isManager based on role selection
            next.isManager = value === 'Department Manager' || value === 'System Admin';
        }

        setFormData(next);
        setError('');
    };

    const handlePositionSelect = (pos) => {
        const option = POSITION_OPTIONS.find(o => o.value === pos);
        if (!option) return;
        
        setFormData(prev => ({
            ...prev,
            position: pos,
            role: option.label,
            isManager: pos === 'MANAGER'
        }));
    };

    const filteredLocs = LOC_CODES.filter(code => 
        code.toLowerCase().includes(locSearch.toLowerCase())
    ).slice(0, 50); // Limit results for performance

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.email || !formData.password) {
            setError('Please fill in all required fields.');
            return;
        }

        if (!isLoginMode) {
            if (formData.password !== formData.confirmPassword) {
                const msg = 'Passwords do not match.';
                setError(msg);
                toast.error(msg);
                return;
            }
            if (!formData.name) {
                setError('Full Name is required.');
                return;
            }
        }

        try {
            if (!isLoginMode) {
                console.log("Attempting real backend registration...");
                const registerData = {
                    email: formData.email,
                    password: formData.password,
                    full_name: formData.name,
                    phone: formData.phone,
                    company: formData.company,
                    role: ROLES.find(r => r.label === formData.role)?.slug || 'END_USER',
                    domain: formData.domain || null,
                    department: formData.department,
                    location: formData.location,
                    loc_type: formData.loc_type,
                    department: formData.department,
                    sub_dept: formData.sub_dept,
                    designation: formData.designation,
                    persona: formData.persona,
                    protocol_id: formData.protocol_id,
                    position: formData.position,
                };

                try {
                    await apiClient.register(registerData);
                    console.log("Registration successful!");
                    const msg = 'Registration successful! Your account is pending administrator approval. You will be able to log in once activated.';
                    setSuccessMsg(msg);
                    toast.success(msg);
                    setIsLoginMode(true);
                    return; // Stop here, don't try to log in since status is PENDING
                } catch (regErr) {
                    console.error("Registration failed:", regErr);
                    const msg = regErr.message || 'Registration failed. Please try again.';
                    setError(msg);
                    toast.error(msg);
                    return;
                }
            }

            console.log("Attempting real backend login...");
            const authResponse = await apiClient.login(formData.email, formData.password);
            console.log("Real backend login successful!");

            // Map backend response to what RoleContext expects
            // Root Fix: Include plan for AI Assistant subscription enforcement
            const userData = {
                id: authResponse.user.id,
                userName: authResponse.user.full_name || authResponse.user.email.split('@')[0],
                role: authResponse.user.role,
                location: authResponse.user.location,
                email: authResponse.user.email,
                position: authResponse.user.position,
                domain: authResponse.user.domain,
                department: authResponse.user.department,
                company: authResponse.user.company,
                createdAt: authResponse.user.created_at,
                plan: authResponse.user.plan || 'STARTER'
            };

            // Root fix: do not log in if backend ever returns a non-ACTIVE user (e.g. PENDING)
            const userStatus = authResponse.user?.status;
            if (userStatus && userStatus !== 'ACTIVE') {
                setError('');
                const pendingMsg = 'Your account is pending administrator approval. You will be able to log in once activated.';
                setSuccessMsg(pendingMsg);
                toast.info?.(pendingMsg) ?? toast.success(pendingMsg);
                return;
            }

            login(userData);
            router.push('/');
        } catch (e) {
            console.warn("Real backend auth failed:", e);
            // Root fix: show clear message for PENDING / not active (backend returns 401 with activation message)
            const rawMsg = e.message || '';
            const isPendingOrInactive = /not active|activation|pending/i.test(rawMsg) || (e.response?.data?.detail && /not active|activation|pending/i.test(String(e.response.data.detail)));
            const msg = isPendingOrInactive
                ? 'Your account is pending administrator approval. You will be able to log in once activated.'
                : (rawMsg || 'Authentication failed. Please check your credentials.');
            if (isPendingOrInactive) {
                setError('');
                setSuccessMsg(msg);
                toast.success(msg);
            } else {
                setError(msg);
                toast.error(msg);
            }

            // Optional: Keep mock fallback for demonstration if desired, but user specifically asked for DB reflection
            /*
            const mockUserData = {
                userName: formData.name || formData.email.split('@')[0],
                role: formData.role,
                location: formData.location,
                email: formData.email,
                position: formData.isManager ? 'MANAGER' : 'EMPLOYEE'
            };
            login(mockUserData);
            router.push('/');
            */
        }
    };

    // NEW: Tactical Redesign
    const toggleMode = () => {
        if (isAnimating) return;
        setIsAnimating(true);
        // Play scan "sound" or visual feedback
        setTimeout(() => {
            setIsLoginMode(!isLoginMode);
            setIsAnimating(false);
        }, 600); // Slightly longer for the biometric scan feel
    };

    const ScanningOverlay = () => (
        <div className={`absolute inset-0 z-[100] pointer-events-none transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}>
            <div className="absolute inset-0 bg-primary/5 backdrop-blur-[2px]"></div>
            <div className="absolute top-0 left-0 w-full h-[2px] bg-primary shadow-[0_0_15px_var(--color-primary)] animate-scan-fast"></div>
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center">
                <div className="text-[10px] font-mono text-primary tracking-[0.5em] uppercase animate-pulse">
                    &gt; RECALIBRATING_INTERFACES...
                </div>
            </div>
        </div>
    );


    return (
        <div className="min-h-screen bg-app-bg text-app-text font-['Space_Grotesk'] flex items-center justify-center p-4 md:p-8 overflow-hidden relative selection:bg-primary/30 transition-colors duration-500">
            
            {/* Background Telemetry Layers */}
            <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-20">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--color-primary)_0%,_transparent_70%)] opacity-10 dark:opacity-40"></div>
                <div className="absolute top-10 left-10 text-[10px] space-y-1 text-primary/50 uppercase tracking-tight font-mono">
                    <div>LAT: 40.7128° N</div>
                    <div>LNG: 74.0060° W</div>
                    <div>ALT: 42.0m</div>
                </div>
                <div className="absolute top-10 right-10 text-[10px] text-primary/50 uppercase tracking-tight font-mono text-right">
                    <div>SYSTEM: RETAIL-PULSE V1</div>
                    <div>ENCRYPTION: AES-256-GCM</div>
                    <div>STATUS: OPERATIONAL</div>
                </div>
                <div className="absolute bottom-10 left-10 w-32 h-[1px] bg-gradient-to-r from-primary/50 to-transparent"></div>
                <div className="absolute bottom-10 right-10 flex gap-2">
                    <div className="w-1 h-1 bg-primary animate-pulse"></div>
                    <div className="text-[10px] text-primary/50 font-mono uppercase tracking-widest">{isMounted ? currentTime : '00:00:00'} UTC</div>
                </div>
            </div>

            {/* SCANNING LINE */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-primary/20 shadow-[0_0_15px_rgba(var(--color-primary),0.3)] animate-scan z-50 pointer-events-none"></div>

            <div className={`w-full max-w-5xl flex flex-col items-center z-10 transition-all duration-700 ${isAnimating ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100 blur-0'}`}>
                
                {/* BRAND HEADER */}
                <div className="mb-12 text-center relative group">
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <div className="w-10 h-10 border-2 border-primary flex items-center justify-center relative overflow-hidden">
                            <Disc className="text-primary animate-spin-slow" size={24} />
                            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-app-text"></div>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-[0.2em] uppercase text-primary">
                            Retail Pulse
                        </h1>
                    </div>
                    <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
                    <p className="mt-3 text-app-text-muted text-xs tracking-widest uppercase font-medium">Retail Lifecycle & Staff Management</p>
                </div>

                {/* MAIN AUTH CONTAINER */}
                <div className={`w-full max-w-2xl glass-panel !rounded-none !bg-app-surface/80 backdrop-blur-xl border border-app-border/30 shadow-2xl relative overflow-hidden ${isAnimating ? 'animate-glitch' : ''}`}>
                    
                    {/* TRANSITION OVERLAY */}
                    <ScanningOverlay />
                    {/* TABS */}
                    <div className="flex border-b border-app-border/30">
                        <button 
                            onClick={() => !isLoginMode && toggleMode()}
                            className={`flex-1 py-5 text-sm font-bold tracking-widest uppercase transition-all relative overflow-hidden ${isLoginMode ? 'text-primary bg-app-surface-soft' : 'text-app-text-muted hover:text-app-text'}`}
                        >
                            Staff Sign-In
                            {isLoginMode && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary shadow-[0_0_10px_var(--color-primary)]"></div>}
                        </button>
                        <button 
                            onClick={() => isLoginMode && toggleMode()}
                            className={`flex-1 py-5 text-sm font-bold tracking-widest uppercase transition-all relative overflow-hidden ${!isLoginMode ? 'text-primary bg-app-surface-soft' : 'text-app-text-muted hover:text-app-text'}`}
                        >
                            Staff Onboarding
                            {!isLoginMode && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary shadow-[0_0_10px_var(--color-primary)]"></div>}
                        </button>
                    </div>

                    <div className="p-8 md:p-12">
                        {/* Status Label */}
                        <div className="flex items-center gap-2 mb-8 animate-in fade-in slide-in-from-left-4 duration-500">
                            <div className={`w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]`}></div>
                            <span className="text-[10px] font-bold tracking-widest uppercase text-app-text-muted">
                                {isLoginMode ? 'Sector: Access Gateway' : 'Sector: Staff Onboarding'}
                            </span>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            {!isLoginMode ? (
                                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {/* Personal Identity */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                                    <div className="absolute -left-4 top-0 bottom-0 w-[2px] bg-primary/20"></div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Full Name</label>
                                            <div className="relative group">
                                                <input
                                                    type="text"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleInputChange}
                                                    placeholder="IDENTITY_NODE"
                                                className="w-full bg-app-surface-soft border border-app-border/40 rounded-none py-3 px-4 text-sm focus:outline-none focus:border-primary transition-all font-mono placeholder:text-app-text-muted/30"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Network / Phone</label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                                placeholder="+X 000-0000"
                                                className="w-full bg-app-surface-soft border border-app-border/40 rounded-none py-3 px-4 text-sm focus:outline-none focus:border-primary transition-all font-mono placeholder:text-app-text-muted/30"
                                            />
                                        </div>
                                    </div>

                                    {/* ── Position Toggle (v2 Retail Onboarding) ── */}
                                    <div className="space-y-4 relative">
                                        <div className="absolute -left-4 top-0 bottom-0 w-[2px] bg-primary/20"></div>
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Position & Access Level</label>
                                            <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-none ${POSITION_OPTIONS.find(p => p.value === formData.position)?.badge}`}>
                                                System Role: {formData.role}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {POSITION_OPTIONS.map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => handlePositionSelect(opt.value)}
                                                    className={`relative flex flex-col p-4 border transition-all duration-300 group text-left ${
                                                        formData.position === opt.value ? opt.activeColor : 'border-app-border/40 bg-app-surface-soft hover:border-primary/40 text-app-text-muted hover:text-app-text'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between mb-3">
                                                        <opt.Icon size={18} className={formData.position === opt.value ? 'text-inherit' : 'opacity-40 group-hover:opacity-100 transition-opacity'} />
                                                        {formData.position === opt.value && (
                                                            <div className="w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]"></div>
                                                        )}
                                                    </div>
                                                    <div className="font-bold uppercase tracking-tight text-xs mb-1">{opt.label}</div>
                                                    <div className="text-[10px] leading-relaxed opacity-60 font-medium">{opt.desc}</div>
                                                    
                                                    {/* Kinetic hover flash */}
                                                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Structural Scoping (Retail structural fields) */}
                                    <div className="space-y-6 relative">
                                        <div className="absolute -left-4 top-0 bottom-0 w-[2px] bg-primary/20"></div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-primary uppercase tracking-widest">LOC (Location Code)</label>
                                                <div className="relative" ref={locDropdownRef}>
                                                    <div className="relative group">
                                                        <Search size={14} className={`absolute left-3 top-3.5 transition-all ${isLocDropdownOpen ? 'text-primary' : 'text-primary/40'}`} />
                                                        <input
                                                            type="text"
                                                            placeholder={formData.location || "SEARCH_LOC..."}
                                                            value={locSearch}
                                                            onChange={(e) => {
                                                                setLocSearch(e.target.value);
                                                                setIsLocDropdownOpen(true);
                                                            }}
                                                            onFocus={() => setIsLocDropdownOpen(true)}
                                                            className="w-full bg-app-surface-soft border border-app-border/40 rounded-none py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-all font-mono uppercase"
                                                        />
                                                        {locSearch && (
                                                            <button 
                                                                type="button"
                                                                onClick={() => {
                                                                    setLocSearch('');
                                                                    setFormData(prev => ({ ...prev, location: '' }));
                                                                }}
                                                                className="absolute right-3 top-3.5 text-app-text-muted hover:text-primary transition-colors"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        )}
                                                    </div>

                                                    {isLocDropdownOpen && (
                                                        <div className="absolute z-50 left-0 right-0 mt-1 bg-app-surface border border-primary/30 shadow-2xl max-h-60 overflow-y-auto no-scrollbar backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
                                                            <div className="p-2 border-b border-app-border/20 bg-primary/5">
                                                                <span className="text-[9px] font-bold text-primary/60 uppercase tracking-tighter">Results: {filteredLocs.length} nodes detected</span>
                                                            </div>
                                                            {filteredLocs.length > 0 ? (
                                                                filteredLocs.map(code => (
                                                                    <button
                                                                        key={code}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const autoType = LOCATION_TYPE_MAP[code] || formData.loc_type;
                                                                            setFormData(prev => ({ 
                                                                                ...prev, 
                                                                                location: code,
                                                                                loc_type: autoType 
                                                                            }));
                                                                            setLocSearch('');
                                                                            setIsLocDropdownOpen(false);
                                                                        }}
                                                                        className={`w-full text-left px-4 py-2.5 text-xs font-mono transition-all hover:bg-primary/10 border-l-2 ${formData.location === code ? 'border-primary bg-primary/5 text-primary' : 'border-transparent text-app-text-muted hover:text-app-text'}`}
                                                                    >
                                                                        {code}
                                                                    </button>
                                                                ))
                                                            ) : (
                                                                <div className="px-4 py-8 text-center">
                                                                    <Disc className="w-5 h-5 mx-auto mb-2 text-danger animate-spin opacity-40" />
                                                                    <span className="text-[10px] uppercase font-bold text-danger/60 tracking-widest">No Node Detected</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-primary uppercase tracking-widest">LOC-TYPE</label>
                                                <div className="relative">
                                                    <select
                                                        name="loc_type"
                                                        value={formData.loc_type}
                                                        onChange={handleInputChange}
                                                        className="w-full bg-app-surface-soft border border-app-border/40 rounded-none py-3 px-4 text-sm focus:outline-none focus:border-primary transition-all font-mono uppercase appearance-none cursor-pointer pr-10"
                                                    >
                                                        <option value="">SELECT_TYPE</option>
                                                        {LOC_TYPES.map(type => (
                                                            <option key={type} value={type}>{type}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-primary pointer-events-none opacity-60" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Dept</label>
                                                <div className="relative">
                                                    <select
                                                        name="department"
                                                        value={formData.department}
                                                        onChange={handleInputChange}
                                                        className="w-full bg-app-surface-soft border border-app-border/40 rounded-none py-3 px-4 text-sm focus:outline-none focus:border-primary transition-all font-mono uppercase appearance-none cursor-pointer pr-10"
                                                    >
                                                        <option value="">SELECT_DEPT</option>
                                                        {DEPARTMENTS.map(dept => (
                                                            <option key={dept} value={dept}>{dept}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-primary pointer-events-none opacity-60" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Sub-Dept.</label>
                                                <div className="relative">
                                                    <select
                                                        name="sub_dept"
                                                        value={formData.sub_dept}
                                                        onChange={handleInputChange}
                                                        className="w-full bg-app-surface-soft border border-app-border/40 rounded-none py-3 px-4 text-sm focus:outline-none focus:border-primary transition-all font-mono uppercase appearance-none cursor-pointer pr-10"
                                                    >
                                                        <option value="">{formData.department ? "SELECT_SUB_DEPT" : "SELECT_DEPT_FIRST"}</option>
                                                        {RETAIL_HIERARCHY[formData.department] && Object.keys(RETAIL_HIERARCHY[formData.department]).map(sub => (
                                                            <option key={sub} value={sub}>{sub}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-primary pointer-events-none opacity-60" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Designation</label>
                                                <div className="relative">
                                                    <select
                                                        name="designation"
                                                        value={formData.designation}
                                                        onChange={handleInputChange}
                                                        className="w-full bg-app-surface-soft border border-app-border/40 rounded-none py-3 px-4 text-sm focus:outline-none focus:border-primary transition-all font-mono uppercase appearance-none cursor-pointer pr-10"
                                                    >
                                                        <option value="">{formData.sub_dept ? "SELECT_ROLE" : (formData.department ? "SELECT_SUB_DEPT_FIRST" : "SELECT_DEPT_FIRST")}</option>
                                                        {RETAIL_HIERARCHY[formData.department] && formData.sub_dept && RETAIL_HIERARCHY[formData.department][formData.sub_dept] && RETAIL_HIERARCHY[formData.department][formData.sub_dept].map(role => (
                                                            <option key={role} value={role}>{role}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-primary pointer-events-none opacity-60" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Functional Persona</label>
                                                <div className="relative" ref={personaDropdownRef}>
                                                    <div className="relative group">
                                                        <Search size={14} className={`absolute left-3 top-3.5 transition-all ${isPersonaDropdownOpen ? 'text-primary' : 'text-primary/40'}`} />
                                                        <input
                                                            type="text"
                                                            placeholder={formData.persona ? (PERSONA_MAP[formData.department]?.find(p => p.value === formData.persona)?.label || formData.persona) : "SEARCH_ROLE..."}
                                                            value={personaSearch}
                                                            onChange={(e) => {
                                                                setPersonaSearch(e.target.value);
                                                                setIsPersonaDropdownOpen(true);
                                                            }}
                                                            onFocus={() => setIsPersonaDropdownOpen(true)}
                                                            className="w-full bg-app-surface-soft border border-app-border/40 rounded-none py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-all font-mono uppercase"
                                                        />
                                                        {personaSearch && (
                                                            <button 
                                                                type="button"
                                                                onClick={() => {
                                                                    setPersonaSearch('');
                                                                    setFormData(prev => ({ ...prev, persona: '' }));
                                                                }}
                                                                className="absolute right-3 top-3.5 text-app-text-muted hover:text-primary transition-colors"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        )}
                                                    </div>

                                                    {isPersonaDropdownOpen && (
                                                        <div className="absolute z-50 left-0 right-0 mt-1 bg-app-surface border border-primary/30 shadow-2xl max-h-60 overflow-y-auto no-scrollbar backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
                                                            <div className="p-2 border-b border-app-border/20 bg-primary/5">
                                                                <span className="text-[9px] font-bold text-primary/60 uppercase tracking-tighter">Matches: {filteredPersonas.length} designations found</span>
                                                            </div>
                                                            {filteredPersonas.length > 0 ? (
                                                                filteredPersonas.map(p => (
                                                                    <button
                                                                        key={p.value}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setFormData(prev => ({ ...prev, persona: p.value }));
                                                                            setPersonaSearch('');
                                                                            setIsPersonaDropdownOpen(false);
                                                                        }}
                                                                        className={`w-full text-left px-4 py-2.5 text-xs font-mono transition-all hover:bg-primary/10 border-l-2 ${formData.persona === p.value ? 'border-primary bg-primary/5 text-primary' : 'border-transparent text-app-text-muted hover:text-app-text'}`}
                                                                    >
                                                                        <div className="flex justify-between items-center">
                                                                            <span>{p.label}</span>
                                                                            {formData.persona === p.value && <Check size={12} />}
                                                                        </div>
                                                                    </button>
                                                                ))
                                                            ) : (
                                                                <div className="px-4 py-8 text-center text-danger/60">
                                                                    <span className="text-[10px] uppercase font-bold tracking-widest leading-none">Access Restricted: Role Not Found</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Staff Protocol ID</label>
                                            <input
                                                type="text"
                                                name="protocol_id"
                                                value={formData.protocol_id}
                                                onChange={handleInputChange}
                                                placeholder="RP-STF-XXXX"
                                                className="w-full bg-app-surface-soft border border-app-border/40 rounded-none py-3 px-4 text-sm focus:outline-none focus:border-primary transition-all font-mono uppercase"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {/* Credentials Section (Always visible) */}
                            <div className="space-y-6 relative">
                                <div className={`absolute -left-4 top-0 bottom-0 w-[2px] bg-primary/20`}></div>
                                <div className="space-y-2">
                                    <label className={`text-[10px] font-bold uppercase tracking-widest text-primary`}>Staff Email</label>
                                    <div className="relative">
                                        <Mail size={16} className={`absolute left-4 top-3.5 text-primary opacity-40`} />
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            placeholder="STAFF@RETAIL.PULSE"
                                            className={`w-full bg-app-surface-soft border border-app-border/40 rounded-none py-3 pl-12 pr-4 text-sm focus:outline-none transition-all font-mono focus:border-primary`}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className={`text-[10px] font-bold uppercase tracking-widest text-primary`}>Access Credential</label>
                                        <div className="relative">
                                            <Lock size={16} className={`absolute left-4 top-3.5 text-primary opacity-40`} />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                name="password"
                                                value={formData.password}
                                                onChange={handleInputChange}
                                                placeholder="••••••••"
                                                className={`w-full bg-app-surface-soft border border-app-border/40 rounded-none py-3 pl-12 pr-12 text-sm focus:outline-none transition-all font-mono focus:border-primary`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-3.5 text-app-text-muted/50 hover:text-app-text transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {!isLoginMode && (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Verify Access Credential</label>
                                            <div className="relative">
                                                <Check size={16} className="absolute left-4 top-3.5 text-primary opacity-40" />
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    name="confirmPassword"
                                                    value={formData.confirmPassword}
                                                    onChange={handleInputChange}
                                                    placeholder="••••••••"
                                                    className="w-full bg-app-surface-soft border border-app-border/40 rounded-none py-3 pl-12 pr-12 text-sm focus:outline-none focus:border-primary transition-all font-mono"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-4 top-3.5 text-app-text-muted/50 hover:text-app-text transition-colors"
                                                >
                                                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-danger/10 border-l-2 border-danger text-danger text-[10px] uppercase font-bold tracking-widest animate-shake">
                                    GATEWAY_ERROR: {error}
                                </div>
                            )}

                            {successMsg && (
                                <div className="p-3 bg-primary/10 border-l-2 border-primary text-primary text-[10px] uppercase font-bold tracking-widest animate-pulse">
                                    PROTOCOL_MSG: {successMsg}
                                </div>
                            )}

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={`w-full py-4 rounded-none font-bold text-sm tracking-[0.3em] uppercase transition-all transform active:scale-[0.98] relative overflow-hidden group ${isLoading ? 'opacity-50 cursor-not-allowed' : ''} bg-primary text-white dark:text-[#122f5f] hover:bg-app-text hover:text-app-bg shadow-[0_0_20px_var(--color-primary)/30]`}
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                                    {isLoading ? 'Relaying Pulse...' : (isLoginMode ? 'Authorize Access' : 'Onboard Staff')}
                                    {!isLoading && <ArrowRight size={18} className="inline ml-2 transition-transform group-hover:translate-x-1" />}
                                </button>
                            </div>
                        </form>

                        {/* SSO Section */}
                        {isLoginMode && (
                            <div className="mt-12 space-y-6">
                                <div className="relative flex items-center">
                                    <div className="flex-grow border-t border-app-border/40"></div>
                                    <span className="flex-shrink mx-4 text-[10px] font-bold text-app-text-muted uppercase tracking-[0.2em]">External Access Gateways</span>
                                    <div className="flex-grow border-t border-app-border/40"></div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <button onClick={() => handleSSOLogin('google')} className="flex items-center justify-center py-3 border border-app-border/40 bg-app-surface-soft hover:bg-app-surface hover:border-primary/50 transition-all grayscale opacity-50 hover:grayscale-0 hover:opacity-100">
                                        <img src="https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png" className="w-5 h-5" alt="Google" />
                                    </button>
                                    <button onClick={() => handleSSOLogin('azure')} className="flex items-center justify-center py-3 border border-app-border/40 bg-app-surface-soft hover:bg-app-surface hover:border-primary/50 transition-all grayscale opacity-50 hover:grayscale-0 hover:opacity-100">
                                        <img src="https://authjs.dev/img/providers/azure.svg" className="w-5 h-5" alt="Azure" />
                                    </button>
                                    <button onClick={() => handleSSOLogin('okta')} className="flex items-center justify-center py-3 border border-app-border/40 bg-app-surface-soft hover:bg-app-surface hover:border-primary/50 transition-all grayscale opacity-50 hover:grayscale-0 hover:opacity-100">
                                        <img src="https://authjs.dev/img/providers/okta.svg" className="w-5 h-5" alt="Okta" />
                                    </button>
                                </div>
                                <div className="text-center pt-4">
                                    <Link href="/forgot-password">
                                        <span className="text-[10px] font-bold text-app-text-muted hover:text-primary uppercase tracking-widest cursor-pointer transition-colors border-b border-transparent hover:border-primary">LOST_PROTOCOL? / PWD_RECOVERY</span>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* DECORATIVE CORNER ACCENTS */}
                    <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none">
                        <div className="absolute top-2 right-2 w-4 h-[1px] bg-app-text/20"></div>
                        <div className="absolute top-2 right-2 w-[1px] h-4 bg-app-text/20"></div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes scan {
                    0% { transform: translateY(-100%); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateY(100vh); opacity: 0; }
                }
                .animate-scan {
                    animation: scan 4s linear infinite;
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }
                .animate-shake {
                    animation: shake 0.2s ease-in-out 2;
                }
                @keyframes scan-fast {
                    0% { transform: translateY(-100%); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateY(600px); opacity: 0; }
                }
                .animate-scan-fast {
                    animation: scan-fast 0.6s ease-in-out infinite;
                }
                @keyframes glitch {
                    0% { opacity: 0.9; filter: contrast(1.1) brightness(1.2); }
                    50% { opacity: 1; filter: contrast(1) brightness(1); }
                    100% { opacity: 0.9; filter: contrast(1.1) brightness(1.2); }
                }
                .animate-glitch {
                    animation: glitch 0.1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

// Add generic styles if needed mostly handled by Tailwind
