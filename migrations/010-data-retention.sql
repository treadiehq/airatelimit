-- Migration: Data Retention and Cleanup
-- Version: 010
--
-- Creates functions and optional triggers for automatic data cleanup
-- to prevent unbounded table growth.

-- =====================================================
-- DATA RETENTION FUNCTION: Usage Counters
-- Keeps last 90 days of usage data by default
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_old_usage_counters(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM usage_counters
  WHERE "periodStart" < CURRENT_DATE - retention_days;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_usage_counters IS 'Deletes usage_counters older than retention_days (default 90)';

-- =====================================================
-- DATA RETENTION FUNCTION: Security Events
-- Keeps last 30 days of security events by default
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_old_security_events(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM security_events
  WHERE "createdAt" < CURRENT_TIMESTAMP - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_security_events IS 'Deletes security_events older than retention_days (default 30)';

-- =====================================================
-- DATA RETENTION FUNCTION: Anonymization Logs
-- Keeps last 7 days of anonymization logs by default
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_old_anonymization_logs(retention_days INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM anonymization_logs
  WHERE "createdAt" < CURRENT_TIMESTAMP - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_anonymization_logs IS 'Deletes anonymization_logs older than retention_days (default 7)';

-- =====================================================
-- MASTER CLEANUP FUNCTION
-- Runs all cleanup functions and returns summary
-- =====================================================

CREATE OR REPLACE FUNCTION run_all_cleanups(
  usage_retention INTEGER DEFAULT 90,
  security_retention INTEGER DEFAULT 30,
  anonymization_retention INTEGER DEFAULT 7
)
RETURNS TABLE(
  table_name TEXT,
  deleted_rows INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 'usage_counters'::TEXT, cleanup_old_usage_counters(usage_retention)
  UNION ALL
  SELECT 'security_events'::TEXT, cleanup_old_security_events(security_retention)
  UNION ALL
  SELECT 'anonymization_logs'::TEXT, cleanup_old_anonymization_logs(anonymization_retention);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION run_all_cleanups IS 'Runs all cleanup functions. Usage: SELECT * FROM run_all_cleanups(90, 30, 7);';

-- =====================================================
-- VACUUM FUNCTION
-- Run VACUUM ANALYZE on high-write tables
-- =====================================================

CREATE OR REPLACE FUNCTION vacuum_high_write_tables()
RETURNS VOID AS $$
BEGIN
  -- VACUUM ANALYZE cannot be run inside a function directly,
  -- but we can at least run ANALYZE
  ANALYZE usage_counters;
  ANALYZE security_events;
  ANALYZE anonymization_logs;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION vacuum_high_write_tables IS 'Runs ANALYZE on high-write tables. For VACUUM, run manually: VACUUM ANALYZE usage_counters;';

-- =====================================================
-- STATISTICS VIEW
-- Quick overview of table sizes and row counts
-- =====================================================

CREATE OR REPLACE VIEW table_statistics AS
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname || '.' || tablename)) AS table_size,
  pg_size_pretty(pg_indexes_size(schemaname || '.' || tablename)) AS index_size,
  (SELECT reltuples::BIGINT FROM pg_class WHERE relname = tablename) AS estimated_rows
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('usage_counters', 'projects', 'users', 'organizations', 
                    'security_events', 'anonymization_logs', 'identity_limits')
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;

COMMENT ON VIEW table_statistics IS 'Quick overview of table sizes. Usage: SELECT * FROM table_statistics;';

-- =====================================================
-- INDEX USAGE VIEW
-- Shows which indexes are being used
-- =====================================================

CREATE OR REPLACE VIEW index_usage AS
SELECT
  schemaname,
  relname AS tablename,
  indexrelname AS indexname,
  idx_scan AS times_used,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  CASE 
    WHEN idx_scan = 0 THEN 'UNUSED - consider dropping'
    WHEN idx_scan < 100 THEN 'LOW usage'
    ELSE 'ACTIVE'
  END AS status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

COMMENT ON VIEW index_usage IS 'Shows index usage statistics. Usage: SELECT * FROM index_usage;';

-- =====================================================
-- SLOW QUERY HELPER
-- (Requires pg_stat_statements extension)
-- =====================================================

-- Uncomment if pg_stat_statements is available:
-- CREATE OR REPLACE VIEW slow_queries AS
-- SELECT
--   substring(query, 1, 100) AS query_preview,
--   calls,
--   round(total_exec_time::numeric, 2) AS total_time_ms,
--   round(mean_exec_time::numeric, 2) AS avg_time_ms,
--   round(max_exec_time::numeric, 2) AS max_time_ms,
--   rows
-- FROM pg_stat_statements
-- WHERE query NOT LIKE '%pg_%'
-- ORDER BY mean_exec_time DESC
-- LIMIT 20;

