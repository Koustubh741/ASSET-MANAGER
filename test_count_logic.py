
import ipaddress

def test_count(cidr):
    try:
        net = ipaddress.ip_network(cidr, strict=False)
        total_ips = net.num_addresses
        if net.prefixlen < 31:
            total_ips -= 2
        print(f"CIDR: {cidr} -> Count: {total_ips}")
    except Exception as e:
        print(f"Error for {cidr}: {e}")

print("Testing host count logic:")
test_count("192.168.1.0/24") # Expected: 254
test_count("10.0.0.0/8")    # Expected: 16777214
test_count("172.16.0.0/16") # Expected: 65534
test_count("192.168.1.1/32") # Expected: 1
test_count("192.168.1.0/31") # Expected: 2
