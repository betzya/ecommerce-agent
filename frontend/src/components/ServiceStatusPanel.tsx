const DEPENDENCY_LABELS: Record<string, string> = {
  database: "数据库",
  ecommerce_backend: "电商后端",
  llm_api: "LLM API",
};

type ServiceStatusPanelProps = {
  health: Record<string, unknown> | undefined;
  error?: string;
  onRefresh: () => void;
};

export function ServiceStatusPanel({ health, error, onRefresh }: ServiceStatusPanelProps) {
  const dependencies = (health?.dependencies as Record<string, string> | undefined) ?? {};
  const overall = typeof health?.status === "string" ? health.status : error ? "down" : "unknown";

  return (
    <section className="panel status-panel" aria-label="服务状态">
      <div className="panel-header">
        <span>服务状态</span>
        <small className={overall === "ok" ? "status-ok-text" : "status-warn-text"}>
          {overall === "ok" ? "正常" : "异常"}
        </small>
        <button type="button" className="refresh-button" onClick={onRefresh}>
          刷新
        </button>
      </div>

      {error ? (
        <p className="status-error">{error}</p>
      ) : (
        <ul className="status-list">
          {Object.entries(dependencies).map(([key, value]) => (
            <li key={key} className="status-row">
              <span className="status-name">{DEPENDENCY_LABELS[key] ?? key}</span>
              <span className={value === "ok" ? "status-ok" : "status-down"}>
                {value === "ok" ? "✓ 正常" : "✗ 异常"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
