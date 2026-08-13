CREATE INDEX IF NOT EXISTS idx_daily_sales_reports_date_status
    ON daily_sales_reports(report_date, status)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_agent_settlements_report
    ON agent_settlements(report_id)
    WHERE deleted_at IS NULL;
