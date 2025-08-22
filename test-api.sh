#!/bin/bash
echo "🔍 Testing Railway Backend API..."

# Test different possible backend URLs
URLS=(
  "https://story-reader-backend-production.up.railway.app"
  "https://romantic-flexibility.up.railway.app" 
  "https://romance-me-backend-production.up.railway.app"
)

for url in "${URLS[@]}"; do
  echo ""
  echo "Testing: $url"
  echo "---"
  
  # Test basic connectivity
  response=$(curl -s -o /dev/null -w "%{http_code}" "$url/test" 2>/dev/null || echo "FAILED")
  echo "GET /test: $response"
  
  # Test books API
  response=$(curl -s -o /dev/null -w "%{http_code}" "$url/api/books" 2>/dev/null || echo "FAILED")
  echo "GET /api/books: $response"
  
  # Test health check
  response=$(curl -s -o /dev/null -w "%{http_code}" "$url/health" 2>/dev/null || echo "FAILED")
  echo "GET /health: $response"
done

echo ""
echo "🔍 Testing Local Backend..."
response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3001/test" 2>/dev/null || echo "FAILED")
echo "Local /test: $response"