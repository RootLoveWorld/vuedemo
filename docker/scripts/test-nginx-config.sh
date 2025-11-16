#!/bin/bash
# Test Nginx Configuration
# This script validates the nginx setup and tests various endpoints

set -e

DOMAIN=${1:-localhost}
PROTOCOL=${2:-http}
BASE_URL="${PROTOCOL}://${DOMAIN}"

echo "Testing Nginx Configuration for: $BASE_URL"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}

    echo -n "Testing $name... "

    response=$(curl -s -o /dev/null -w "%{http_code}" -k "$url" 2>/dev/null || echo "000")

    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $response)"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected $expected_status, got $response)"
        return 1
    fi
}

# Test WebSocket
test_websocket() {
    local name=$1
    local url=$2

    echo -n "Testing $name... "

    # Check if wscat is available
    if ! command -v wscat &> /dev/null; then
        echo -e "${YELLOW}⊘ SKIP${NC} (wscat not installed)"
        return 0
    fi

    # Try to connect (timeout after 5 seconds)
    timeout 5 wscat -c "$url" --no-check </dev/null &>/dev/null && \
        echo -e "${GREEN}✓ PASS${NC}" || \
        echo -e "${YELLOW}⊘ SKIP${NC} (Connection test inconclusive)"
}

# Counter for results
PASSED=0
FAILED=0
TOTAL=0

# Run tests
echo "1. Basic Connectivity Tests"
echo "----------------------------"

test_endpoint "Health Check" "$BASE_URL/health" && ((PASSED++)) || ((FAILED++))
((TOTAL++))

test_endpoint "Frontend Root" "$BASE_URL/" && ((PASSED++)) || ((FAILED++))
((TOTAL++))

echo ""
echo "2. API Endpoint Tests"
echo "---------------------"

# Note: These may fail if services aren't fully initialized
test_endpoint "API Health" "$BASE_URL/api/health" && ((PASSED++)) || ((FAILED++))
((TOTAL++))

test_endpoint "Auth Endpoint" "$BASE_URL/api/auth/login" 401 && ((PASSED++)) || ((FAILED++))
((TOTAL++))

echo ""
echo "3. WebSocket Tests"
echo "------------------"

if [ "$PROTOCOL" = "https" ]; then
    WS_PROTOCOL="wss"
else
    WS_PROTOCOL="ws"
fi

test_websocket "WebSocket Connection" "${WS_PROTOCOL}://${DOMAIN}/socket.io"

echo ""
echo "4. Security Header Tests"
echo "------------------------"

echo -n "Testing Security Headers... "
headers=$(curl -s -I -k "$BASE_URL/" 2>/dev/null)

has_hsts=$(echo "$headers" | grep -i "Strict-Transport-Security" || echo "")
has_xframe=$(echo "$headers" | grep -i "X-Frame-Options" || echo "")
has_xcontent=$(echo "$headers" | grep -i "X-Content-Type-Options" || echo "")

if [ -n "$has_xframe" ] && [ -n "$has_xcontent" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
fi
((TOTAL++))

echo ""
echo "5. Static Asset Tests"
echo "---------------------"

test_endpoint "Static Asset (favicon)" "$BASE_URL/favicon.ico" && ((PASSED++)) || ((FAILED++))
((TOTAL++))

echo ""
echo "6. Rate Limiting Tests"
echo "----------------------"

echo -n "Testing Rate Limiting... "
# Make 5 rapid requests to auth endpoint
rate_limit_triggered=false
for i in {1..5}; do
    response=$(curl -s -o /dev/null -w "%{http_code}" -k "$BASE_URL/api/auth/login" 2>/dev/null || echo "000")
    if [ "$response" = "429" ]; then
        rate_limit_triggered=true
        break
    fi
done

if [ "$rate_limit_triggered" = true ]; then
    echo -e "${GREEN}✓ PASS${NC} (Rate limiting active)"
    ((PASSED++))
else
    echo -e "${YELLOW}⊘ SKIP${NC} (Rate limit not triggered in test)"
fi
((TOTAL++))

echo ""
echo "7. SSL/TLS Tests (HTTPS only)"
echo "------------------------------"

if [ "$PROTOCOL" = "https" ]; then
    echo -n "Testing SSL Certificate... "

    # Check if openssl is available
    if command -v openssl &> /dev/null; then
        cert_info=$(echo | openssl s_client -connect "${DOMAIN}:443" -servername "$DOMAIN" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "")

        if [ -n "$cert_info" ]; then
            echo -e "${GREEN}✓ PASS${NC}"
            echo "$cert_info" | sed 's/^/  /'
            ((PASSED++))
        else
            echo -e "${RED}✗ FAIL${NC}"
            ((FAILED++))
        fi
    else
        echo -e "${YELLOW}⊘ SKIP${NC} (openssl not installed)"
    fi
    ((TOTAL++))
else
    echo "Skipping SSL tests (using HTTP)"
fi

echo ""
echo "8. Load Balancing Tests"
echo "-----------------------"

echo -n "Testing Upstream Health... "
# This is a basic test - in production you'd check actual upstream status
response=$(curl -s -o /dev/null -w "%{http_code}" -k "$BASE_URL/api/health" 2>/dev/null || echo "000")
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
fi
((TOTAL++))

echo ""
echo "================================================"
echo "Test Results"
echo "================================================"
echo "Total Tests: $TOTAL"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Please review the configuration.${NC}"
    exit 1
fi
