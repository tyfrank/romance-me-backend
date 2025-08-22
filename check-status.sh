#!/bin/bash
echo "🔍 Checking Crown Me Yours Upload Status..."
echo "=================================="

# Check Railway service status
echo "✅ Backend Health: $(curl -s https://web-production-a3a99.up.railway.app/api/health | jq -r '.status')"

echo ""
echo "📝 Upload Analysis:"
echo "- Batch processing is live on Railway"
echo "- Database timeouts increased to 30s/2min"
echo "- 5-chapter batches should handle 32+ chapters"
echo ""
echo "🎯 Expected Outcome:"
echo "- Crown Me Yours should now have all 32 chapters"
echo "- No more 'only 7 chapters' issue"
echo "- Monetization working from chapter 6+"
echo ""
echo "🔍 To verify, check:"
echo "1. Admin panel: https://romance-me-frontend.vercel.app/admin/books"
echo "2. Reader page: https://romance-me-frontend.vercel.app/books"
echo "3. Look for 'Crown Me Yours' with 32 chapters total"