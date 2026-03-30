type Metric = {
  label: string;
  value: string;
  delta: string;
  tone: "gold" | "green" | "blue" | "rose";
};

type TicketOrder = {
  id: string;
  customer: string;
  channel: string;
  packageName: string;
  quantity: number;
  amount: string;
  paymentStatus: "Da thanh toan" | "Cho doi soat" | "Rui ro cao";
};

type Alert = {
  title: string;
  detail: string;
  severity: "critical" | "warning" | "normal";
};

const metrics: Metric[] = [
  { label: "Doanh thu hom nay", value: "428.6M", delta: "+12.4%", tone: "gold" },
  { label: "Don cho xu ly", value: "184", delta: "-8 don", tone: "blue" },
  { label: "Ty le thanh cong", value: "98.7%", delta: "+1.1%", tone: "green" },
  { label: "Canh bao gian lan", value: "06", delta: "+2 vu", tone: "rose" },
];

const orders: TicketOrder[] = [
  {
    id: "SL-240329-091",
    customer: "Nguyen Minh Chau",
    channel: "Mobile App",
    packageName: "Combo Dai Vang Cuoi Tuan",
    quantity: 4,
    amount: "876.000d",
    paymentStatus: "Da thanh toan",
  },
  {
    id: "SL-240329-088",
    customer: "Tran Bao Anh",
    channel: "Website",
    packageName: "Bo So Phat Loc 6 Cap",
    quantity: 2,
    amount: "270.000d",
    paymentStatus: "Cho doi soat",
  },
  {
    id: "SL-240329-081",
    customer: "Le Gia Han",
    channel: "CTV Dashboard",
    packageName: "Mien Nam Thuong Xuyen",
    quantity: 8,
    amount: "720.000d",
    paymentStatus: "Rui ro cao",
  },
  {
    id: "SL-240329-079",
    customer: "Vo Quoc Dat",
    channel: "Website",
    packageName: "Combo Chot So Trong Ngay",
    quantity: 3,
    amount: "315.000d",
    paymentStatus: "Da thanh toan",
  },
];

const alerts: Alert[] = [
  {
    title: "Tang dot bien giao dich vao 17:45",
    detail: "Can mo rong queue doi soat thanh toan trong 30 phut toi.",
    severity: "warning",
  },
  {
    title: "01 tai khoan dat trung IP nhieu lan",
    detail: "He thong da danh dau va han che rut ma ve cho den khi xac minh.",
    severity: "critical",
  },
  {
    title: "Dich vu thong bao email van on dinh",
    detail: "Ty le gui thanh cong 99.4% trong 24 gio qua.",
    severity: "normal",
  },
];

const payoutProgress = [
  { label: "Doi soat ngan hang", value: "92%" },
  { label: "Tra cuu ve trung", value: "76%" },
  { label: "Xac nhan dai ly", value: "61%" },
];

function App() {
  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">SL</div>
          <div>
            <strong>SmartLotto Admin</strong>
            <span>Control tower for operations</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Admin navigation">
          <a className="active" href="#overview">
            Tong quan
          </a>
          <a href="#orders">Don ve</a>
          <a href="#settlement">Doi soat</a>
          <a href="#risk">Kiem soat rui ro</a>
          <a href="#agents">Dai ly va CTV</a>
          <a href="#reports">Bao cao</a>
        </nav>

        <section className="sidebar-card">
          <p className="sidebar-eyebrow">Ca truc dang chay</p>
          <h2>18:00 - 22:00</h2>
          <ul>
            <li>Lead Ops: 02 nguoi</li>
            <li>Finance check: 01 nguoi</li>
            <li>Support online: 05 nguoi</li>
          </ul>
        </section>
      </aside>

      <main className="main-content">
        <header className="hero-panel" id="overview">
          <div>
            <p className="eyebrow">Bang dieu khien van hanh</p>
            <h1>Trang admin uu tien xu ly don ve, doi soat va canh bao he thong.</h1>
            <p className="hero-text">
              Mot giao dien quan tri danh cho team dieu hanh, giup nhin nhanh doanh
              thu, trang thai thanh toan, don ton va rui ro theo thoi gian thuc.
            </p>
          </div>

          <div className="hero-status">
            <div>
              <span className="label">Trang thai he thong</span>
              <strong>On dinh</strong>
            </div>
            <div>
              <span className="label">Ky quay dang theo doi</span>
              <strong>29/03 - Mien Nam</strong>
            </div>
            <button type="button">Xuat bao cao cuoi ca</button>
          </div>
        </header>

        <section className="metric-grid">
          {metrics.map((metric) => (
            <article key={metric.label} className={`metric-card tone-${metric.tone}`}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.delta} so voi hom qua</small>
            </article>
          ))}
        </section>

        <section className="content-grid">
          <section className="panel panel-large" id="orders">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Don can theo doi</p>
                <h2>Bang don ve uu tien</h2>
              </div>
              <button type="button" className="ghost-button">
                Loc nang cao
              </button>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ma don</th>
                    <th>Khach hang</th>
                    <th>Kenh</th>
                    <th>Goi ve</th>
                    <th>SL</th>
                    <th>Doanh thu</th>
                    <th>Trang thai</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.id}</td>
                      <td>{order.customer}</td>
                      <td>{order.channel}</td>
                      <td>{order.packageName}</td>
                      <td>{order.quantity}</td>
                      <td>{order.amount}</td>
                      <td>
                        <span
                          className={`status-pill ${order.paymentStatus
                            .toLowerCase()
                            .replaceAll(" ", "-")}`}
                        >
                          {order.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel" id="risk">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Canh bao van hanh</p>
                <h2>Su kien can chu y</h2>
              </div>
            </div>

            <div className="alert-list">
              {alerts.map((alert) => (
                <article key={alert.title} className={`alert-item ${alert.severity}`}>
                  <strong>{alert.title}</strong>
                  <p>{alert.detail}</p>
                </article>
              ))}
            </div>
          </section>
        </section>

        <section className="content-grid">
          <section className="panel" id="settlement">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Tien do doi soat</p>
                <h2>Pipeline xu ly giao dich</h2>
              </div>
            </div>

            <div className="progress-list">
              {payoutProgress.map((item) => (
                <div key={item.label} className="progress-item">
                  <div className="progress-label">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                  <div className="progress-track">
                    <span style={{ width: item.value }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel panel-dark" id="reports">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Thong ke nhanh</p>
                <h2>Hieu suat theo kenh ban</h2>
              </div>
            </div>

            <div className="channel-stats">
              <article>
                <span>Website</span>
                <strong>46%</strong>
              </article>
              <article>
                <span>Mobile App</span>
                <strong>34%</strong>
              </article>
              <article>
                <span>Dai ly va CTV</span>
                <strong>20%</strong>
              </article>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}

export default App;
