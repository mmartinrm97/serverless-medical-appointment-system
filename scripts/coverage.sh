#!/bin/bash

# Coverage Report Generation Script
# Run this script to generate detailed coverage reports

echo "🧪 Running tests with coverage..."

# Run tests with coverage
pnpm test:coverage

echo ""
echo "📊 Coverage Report Generated!"
echo ""
echo "Coverage reports available at:"
echo "  - Text summary: printed above"
echo "  - HTML report: coverage/index.html"
echo "  - JSON report: coverage/coverage-final.json"
echo "  - LCOV report: coverage/lcov.info"
echo ""

# Check if HTML report exists and offer to open it
if [ -f "coverage/index.html" ]; then
    echo "💡 To view the detailed HTML coverage report, open:"
    echo "   file://$(pwd)/coverage/index.html"
    echo ""
fi

# Show coverage summary
echo "🎯 Coverage Thresholds:"
echo "  - Lines: 80%"
echo "  - Functions: 80%"
echo "  - Branches: 80%"
echo "  - Statements: 80%"
echo ""
echo "✅ All tests completed with coverage analysis!"
