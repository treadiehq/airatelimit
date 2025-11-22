#!/bin/bash

# Script to manage reserved organization names

DB_PASSWORD=${PGPASSWORD:-password}
DB_HOST=${PGHOST:-localhost}
DB_PORT=${PGPORT:-5433}
DB_USER=${PGUSER:-postgres}
DB_NAME=${PGDATABASE:-ai_proxy}

function list_reserved() {
    echo "📋 Reserved Organization Names:"
    echo "================================"
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT name, reason, \"createdAt\" FROM reserved_organization_names ORDER BY name;"
}

function reserve_name() {
    local name=$1
    local reason=${2:-"Manually reserved"}
    
    if [ -z "$name" ]; then
        echo "❌ Error: Name is required"
        echo "Usage: $0 reserve <name> [reason]"
        exit 1
    fi
    
    local name_lower=$(echo "$name" | tr '[:upper:]' '[:lower:]')
    
    echo "🔒 Reserving name: $name"
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "INSERT INTO reserved_organization_names (\"name\", \"reason\") VALUES ('$name_lower', '$reason');"
    
    if [ $? -eq 0 ]; then
        echo "✅ Name '$name' reserved successfully"
    else
        echo "❌ Failed to reserve name (may already be reserved)"
    fi
}

function unreserve_name() {
    local name=$1
    
    if [ -z "$name" ]; then
        echo "❌ Error: Name is required"
        echo "Usage: $0 unreserve <name>"
        exit 1
    fi
    
    local name_lower=$(echo "$name" | tr '[:upper:]' '[:lower:]')
    
    echo "🔓 Unreserving name: $name"
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "DELETE FROM reserved_organization_names WHERE \"name\" = '$name_lower';"
    
    if [ $? -eq 0 ]; then
        echo "✅ Name '$name' unreserved successfully"
    else
        echo "❌ Failed to unreserve name"
    fi
}

function check_name() {
    local name=$1
    
    if [ -z "$name" ]; then
        echo "❌ Error: Name is required"
        echo "Usage: $0 check <name>"
        exit 1
    fi
    
    local name_lower=$(echo "$name" | tr '[:upper:]' '[:lower:]')
    
    echo "🔍 Checking name: $name"
    result=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM reserved_organization_names WHERE \"name\" = '$name_lower';" | tr -d ' ')
    
    if [ "$result" -gt 0 ] 2>/dev/null; then
        echo "🔒 Name '$name' is RESERVED"
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT name, reason FROM reserved_organization_names WHERE \"name\" = '$name_lower';"
    else
        echo "✅ Name '$name' is AVAILABLE"
    fi
}

# Main command handler
case "$1" in
    list)
        list_reserved
        ;;
    reserve)
        reserve_name "$2" "$3"
        ;;
    unreserve)
        unreserve_name "$2"
        ;;
    check)
        check_name "$2"
        ;;
    *)
        echo "🔐 Reserved Organization Names Manager"
        echo "======================================"
        echo ""
        echo "Usage: $0 <command> [arguments]"
        echo ""
        echo "Commands:"
        echo "  list                    List all reserved names"
        echo "  reserve <name> [reason] Reserve a new name"
        echo "  unreserve <name>        Remove a reserved name"
        echo "  check <name>            Check if a name is reserved"
        echo ""
        echo "Examples:"
        echo "  $0 list"
        echo "  $0 reserve 'acme' 'Reserved for ACME Corp'"
        echo "  $0 unreserve 'example'"
        echo "  $0 check 'admin'"
        exit 1
        ;;
esac

