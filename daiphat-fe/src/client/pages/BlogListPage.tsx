import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/poklotto-blog.css';
import { Header } from '../components/layout/header';

export const BlogListPage = () => {
  useEffect(() => {
    // Inject Fonts and Icons
    const fontAwesome = document.createElement('link');
    fontAwesome.rel = 'stylesheet';
    fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fontAwesome);

    const googleFont = document.createElement('link');
    googleFont.rel = 'stylesheet';
    googleFont.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700;800&family=Roboto:wght@300;400;500;700&display=swap';
    document.head.appendChild(googleFont);

    return () => {
      document.head.removeChild(fontAwesome);
      document.head.removeChild(googleFont);
    };
  }, []);

  return (
    <div className="poklotto-full-page">
      <Header />
      {/* breadcrumb begin */}
      <section 
        className="breadcrumb-pok" 
        style={{ 
          background: 'url(https://i.imgur.com/86RRLK9.png) center center / cover no-repeat',
          textAlign: 'left',
          padding: '160px 0 100px', // Thêm padding-top để ko bị Header đè lên
          color: '#2A3042'
        }}
      >
        <div className="container" style={{ position: 'relative', zIndex: 1, paddingLeft: '30px' }}>
          <h2 style={{ fontSize: '56px', fontWeight: 800, marginBottom: '20px', fontFamily: "'Roboto', sans-serif", color: '#2C3038' }}>Blog 04</h2>
          <div style={{ fontSize: '15px', color: '#6c757d', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'Roboto', sans-serif" }}>
            <Link to="/" style={{ color: '#6c757d', textDecoration: 'none', transition: '0.3s' }}>Home</Link> 
            <span style={{ fontSize: '12px' }}>&gt;</span>
            <Link to="/blogs" style={{ color: '#6c757d', textDecoration: 'none', transition: '0.3s' }}>Blog</Link> 
            <span style={{ fontSize: '12px' }}>&gt;</span>
            <span style={{ color: '#6c757d' }}>Blog 04</span>
          </div>
        </div>
      </section>

      {/* blog posts begin */}
      <section className="blog-posts">
        <div className="container">
          <div className="row">
            
            <div className="col-xl-8">
              <div className="row">
                {/* 1 */}
                <div className="col-xl-12">
                  <div className="single-blog">
                    <div className="part-img"><img src="/assets/img/blog/blog-post-1.jpg" alt="" /></div>
                    <div className="part-text">
                      <span className="post-category">euro jackpot</span>
                      <h3 className="blog-post-title"><Link to="#">Even more and setted see.</Link></h3>
                      <p>In it in more its bad got what's the based they world the on small where them. Had the equally were so a in sign it like into the kind the found been themselves go.</p>
                      <div className="post-info-stats">
                        <div className="post-creator">
                          <div className="creator-pic"><img src="/assets/img/blog/user-1.jpg" alt="" /></div>
                          <span className="creator-name">Sierra Guzman</span>
                        </div>
                        <span className="posting-time">3 days ago</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* 2 */}
                <div className="col-xl-12">
                  <div className="single-blog right-sided-img">
                    <div className="part-img"><img src="/assets/img/blog/blog-post-3.jpg" alt="" /></div>
                    <div className="part-text">
                      <span className="post-category">mega millions</span>
                      <h3 className="blog-post-title"><Link to="#">Began a need detailed free.</Link></h3>
                      <p>In it in more its bad got what's the based they world the on small where them. Had the equally were so a in sign it like into the kind the found been themselves go.</p>
                      <div className="post-info-stats">
                        <div className="post-creator">
                          <div className="creator-pic"><img src="/assets/img/blog/user-3.jpg" alt="" /></div>
                          <span className="creator-name">Peter Bowen</span>
                        </div>
                        <span className="posting-time">2 days ago</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* 3 */}
                <div className="col-xl-12">
                  <div className="single-blog">
                    <div className="part-img"><img src="/assets/img/blog/blog-post-4.jpg" alt="" /></div>
                    <div className="part-text">
                      <span className="post-category">online lotto</span>
                      <h3 className="blog-post-title"><Link to="#">Similar empire for carpeting.</Link></h3>
                      <p>In it in more its bad got what's the based they world the on small where them. Had the equally were so a in sign it like into the kind the found been themselves go.</p>
                      <div className="post-info-stats">
                        <div className="post-creator">
                          <div className="creator-pic"><img src="/assets/img/blog/user-4.jpg" alt="" /></div>
                          <span className="creator-name">Amelie Flynn</span>
                        </div>
                        <span className="posting-time">1 months ago</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* 4 */}
                <div className="col-xl-12">
                  <div className="single-blog right-sided-img">
                    <div className="part-img"><img src="/assets/img/blog/blog-post-6.jpg" alt="" /></div>
                    <div className="part-text">
                      <span className="post-category">Us powerball</span>
                      <h3 className="blog-post-title"><Link to="#">Heaven with as best academic.</Link></h3>
                      <p>In it in more its bad got what's the based they world the on small where them. Had the equally were so a in sign it like into the kind the found been themselves go.</p>
                      <div className="post-info-stats">
                        <div className="post-creator">
                          <div className="creator-pic"><img src="/assets/img/blog/user-6.jpg" alt="" /></div>
                          <span className="creator-name">Mason Knight</span>
                        </div>
                        <span className="posting-time">2 years ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-4">
              <div className="row">
                {/* 5 */}
                <div className="col-xl-12">
                  <div className="single-blog vertical-style">
                    <div className="part-img"><img src="/assets/img/blog/blog-post-2.jpg" alt="" /></div>
                    <div className="part-text">
                      <span className="post-category">super enalotto</span>
                      <h3 className="blog-post-title"><Link to="#">Titled concept box made to.</Link></h3>
                      <p>In it in more its bad got what's the based they world the on small where them. Had the equally were so a in sign it like into the kind the found been themselves go.</p>
                      <div className="post-info-stats">
                        <div className="post-creator">
                          <div className="creator-pic"><img src="/assets/img/blog/user-2.jpg" alt="" /></div>
                          <span className="creator-name">Henry Butler</span>
                        </div>
                        <span className="posting-time">1 days ago</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* 6 */}
                <div className="col-xl-12">
                  <div className="single-blog vertical-style">
                    <div className="part-img"><img src="/assets/img/blog/blog-post-5.jpg" alt="" /></div>
                    <div className="part-text">
                      <span className="post-category">premier bet</span>
                      <h3 className="blog-post-title"><Link to="#">Entered hard couple seman.</Link></h3>
                      <p>In it in more its bad got what's the based they world the on small where them. Had the equally were so a in sign it like into the kind the found been themselves go.</p>
                      <div className="post-info-stats">
                        <div className="post-creator">
                          <div className="creator-pic"><img src="/assets/img/blog/user-5.jpg" alt="" /></div>
                          <span className="creator-name">Natasha Rowe</span>
                        </div>
                        <span className="posting-time">1 week ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="pok-pagination">
            <ul>
              <li><Link to="#"><i className="fa-solid fa-angles-left"></i></Link></li>
              <li><Link to="#" className="active">01</Link></li>
              <li><Link to="#">02</Link></li>
              <li><Link to="#">03</Link></li>
              <li className="dotted">...</li>
              <li><Link to="#">15</Link></li>
              <li><Link to="#">16</Link></li>
              <li><Link to="#"><i className="fa-solid fa-angles-right"></i></Link></li>
            </ul>
          </div>

          {/* Sidebar Section */}
          <div className="pok-sidebar">
            <div className="row">
              <div className="col-xl-4 col-lg-12">
                <div className="single-element recent-postss">
                  <h4 className="title">Recent posted</h4>
                  <div className="recent-posts">
                    <div className="single-recent-post">
                      <div className="part-img"><img src="/assets/img/blog/recent-post-1.jpg" alt="" /></div>
                      <div className="part-text">
                        <h5 className="post-title"><Link to="#">Even more and setted see.</Link></h5>
                        <div className="post-stats">
                          <span className="text">by <Link to="#" className="posted-by">Sierra Guzman</Link></span>
                          <span className="text">in <Link to="#" className="category-by">MegaMillions</Link></span>
                        </div>
                      </div>
                    </div>
                    <div className="single-recent-post">
                      <div className="part-img"><img src="/assets/img/blog/recent-post-2.jpg" alt="" /></div>
                      <div className="part-text">
                        <h5 className="post-title"><Link to="#">Began a need detailed free.</Link></h5>
                        <div className="post-stats">
                          <span className="text">by <Link to="#" className="posted-by">Peter Bowen</Link></span>
                          <span className="text">in <Link to="#" className="category-by">Euro Jackpot</Link></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-xl-8 col-lg-12">
                <div className="row">
                  <div className="col-xl-6 col-lg-6">
                    <div className="single-element posts-category">
                      <h4 className="title">posts category</h4>
                      <ul className="category-list">
                        <li><Link to="#"><span className="cl-cat">Super enalotto</span><span className="q-numb">(02)</span></Link></li>
                        <li><Link to="#"><span className="cl-cat">us powerball</span><span className="q-numb">(23)</span></Link></li>
                        <li><Link to="#"><span className="cl-cat">euro Millions</span><span className="q-numb">(16)</span></Link></li>
                        <li><Link to="#"><span className="cl-cat">Premier Bet</span><span className="q-numb">(24)</span></Link></li>
                      </ul>
                    </div>
                  </div>
                  <div className="col-xl-6 col-lg-6">
                    <div className="single-element tag-lines">
                      <h4 className="title">posts Tagline</h4>
                      <div className="tag-words">
                        <Link to="#" className="single-tag">lottery</Link>
                        <Link to="#" className="single-tag">jackpot</Link>
                        <Link to="#" className="single-tag">lotto</Link>
                        <Link to="#" className="single-tag">euro millions</Link>
                        <Link to="#" className="single-tag">mega millions</Link>
                        <Link to="#" className="single-tag">powerball</Link>
                        <Link to="#" className="single-tag">giveway</Link>
                        <Link to="#" className="single-tag">lucky</Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-logo"><img src="/assets/img/logo.png" alt="" /></div>
          <p>Lottery players can play Virginia Lottery games online from anywhere in Virginia on a phone, tablet or computer.</p>
          <p style={{marginTop:'40px', fontSize:'14px', opacity:0.5}}>copyright © 2022. all right reserved by PokLotto</p>
        </div>
      </footer>
    </div>
  );
};
