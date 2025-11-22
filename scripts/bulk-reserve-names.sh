#!/bin/bash

# Bulk reserve organization names
# Usage: ./scripts/bulk-reserve-names.sh names.txt

DB_PASSWORD=${PGPASSWORD:-password}
DB_HOST=${PGHOST:-localhost}
DB_PORT=${PGPORT:-5433}
DB_USER=${PGUSER:-postgres}
DB_NAME=${PGDATABASE:-ai_proxy}

if [ -z "$1" ]; then
    echo "📝 Bulk Reserve Organization Names"
    echo "=================================="
    echo ""
    echo "Usage: $0 <names-file.txt>"
    echo ""
    echo "File format: One name per line, optional reason after comma"
    echo ""
    echo "Example file content:"
    echo "  acme,Reserved for ACME Corp"
    echo "  techcorp,Brand protection"
    echo "  startup-name"
    echo ""
    exit 1
fi

FILE=$1

if [ ! -f "$FILE" ]; then
    echo "❌ Error: File '$FILE' not found"
    exit 1
fi

echo "🔒 Bulk reserving names from: $FILE"
echo ""

count=0
while IFS=',' read -r name reason; do
    # Skip empty lines and comments
    if [ -z "$name" ] || [[ $name == \#* ]]; then
        continue
    fi
    
    # Default reason if not provided
    if [ -z "$reason" ]; then
        reason="Bulk reserved"
    fi
    
    # Convert to lowercase
    name_lower=$(echo "$name" | tr '[:upper:]' '[:lower:]' | xargs)
    reason=$(echo "$reason" | xargs)
    
    # Insert into database
    result=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "INSERT INTO reserved_organization_names (\"name\", \"reason\") VALUES ('$name_lower', '$reason') ON CONFLICT (\"name\") DO NOTHING RETURNING id;" 2>&1)
    
    if echo "$result" | grep -q "ERROR"; then
        echo "  ❌ $name - Error"
    elif [ -z "$result" ]; then
        echo "  ⏭️  $name - Already reserved"
    else
        echo "  ✅ $name - Reserved"
        ((count++))
    fi
done < "$FILE"

echo ""
echo "=================================="
echo "✅ Reserved $count new names"
echo ""
echo "Run this to verify:"
echo "./scripts/manage-reserved-names.sh list"

