import { Component, Inject, signal } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

export interface HtmlViewerDialogData {
  businessName: string;
  domain: string;
  yelpUrl: string;
  htmlContent?: string;
  loading?: boolean;
  error?: string;
  yelpHtml?: string;
  domainPages?: {
    domain1?: string;
    domain2?: string;
    domain3?: string;
  };
}

@Component({
  selector: 'app-html-viewer-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatIconModule
  ],
  templateUrl: './html-viewer-dialog.component.html',
  styleUrl: './html-viewer-dialog.component.css'
})
export class HtmlViewerDialogComponent {
  loadingStates = signal<{[key: string]: boolean}>({});
  errorStates = signal<{[key: string]: string}>({});
  pageContents = signal<{[key: string]: string}>({});

  constructor(
    public dialogRef: MatDialogRef<HtmlViewerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: HtmlViewerDialogData
  ) {}

  close(): void {
    this.dialogRef.close();
  }

  openInPopup(url: string, event: Event): void {
    event.preventDefault();
    // Open URL in a popup window with specific dimensions
    const popupFeatures = 'width=1200,height=800,scrollbars=yes,resizable=yes,toolbar=yes,location=yes,status=yes';
    window.open(url, '_blank', popupFeatures);
  }

  extractYelpId(yelpUrl: string): string {
    if (!yelpUrl) return '';
    const matches = yelpUrl.match(/\/biz\/([^?]+)/);
    return matches ? matches[1] : 'Unknown';
  }

  isLoading(pageType: string): boolean {
    return this.loadingStates()[pageType] || false;
  }

  getError(pageType: string): string {
    return this.errorStates()[pageType] || '';
  }

  getPageContent(pageType: string): string {
    const contents = this.pageContents();
    if (pageType === 'yelp') {
      return contents['yelp'] || this.data.yelpHtml || '';
    }
    if (pageType.startsWith('domain')) {
      return contents[pageType] || this.data.domainPages?.[pageType as keyof typeof this.data.domainPages] || '';
    }
    return contents[pageType] || '';
  }

  refreshContent(): void {
    // Future implementation: trigger API calls to refresh content
    console.log('Refreshing content for business:', this.data.businessName);
    // In the future, this would call the bizdata endpoint
    // this.businessService.getBizData(this.extractYelpId(this.data.yelpUrl)).subscribe(...);
  }

  getBizDataApiUrl(): string {
    const yelpId = this.extractYelpId(this.data.yelpUrl);
    return `http://nerds21.redmond.corp.microsoft.com:9000/bizdata?id=${yelpId}`;
  }

  getPlaceholderHtml(pageType: string): string {
    const businessName = this.data.businessName || 'Sample Business';
    const domain = this.data.domain || 'example.com';
    
    switch (pageType) {
      case 'yelp':
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${businessName} | Yelp</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
    <div class="biz-page-header">
        <div class="biz-page-header-wrap">
            <h1 class="biz-page-title">${businessName}</h1>
            <div class="biz-rating-info">
                <div class="rating-stars">
                    <span class="star-rating">★★★★☆</span>
                    <span class="review-count">(127 reviews)</span>
                </div>
                <div class="price-category">
                    <span class="price-level">$$</span>
                    <span class="category-list">Restaurants, American</span>
                </div>
            </div>
        </div>
    </div>
    
    <div class="biz-page-body">
        <div class="biz-details">
            <div class="contact-info">
                <h3>Contact Info</h3>
                <p><strong>Address:</strong> 123 Main St, City, State 12345</p>
                <p><strong>Phone:</strong> (555) 123-4567</p>
                <p><strong>Website:</strong> <a href="https://${domain}">${domain}</a></p>
            </div>
            
            <div class="hours-info">
                <h3>Hours</h3>
                <ul>
                    <li>Mon-Thu: 11:00 AM - 9:00 PM</li>
                    <li>Fri-Sat: 11:00 AM - 10:00 PM</li>
                    <li>Sun: 12:00 PM - 8:00 PM</li>
                </ul>
            </div>
            
            <div class="recent-reviews">
                <h3>Recent Reviews</h3>
                <div class="review">
                    <p>"Great food and excellent service! Highly recommend the special of the day."</p>
                    <div class="reviewer">- Jane D. ★★★★★</div>
                </div>
                <div class="review">
                    <p>"Nice atmosphere, good for family dinners. The staff was very friendly."</p>
                    <div class="reviewer">- Mike R. ★★★★☆</div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;

      case 'domain1':
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ${businessName}</title>
    <link rel="stylesheet" href="/css/main.css">
</head>
<body>
    <header class="main-header">
        <nav class="navigation">
            <div class="logo">
                <h1>${businessName}</h1>
            </div>
            <ul class="nav-menu">
                <li><a href="/">Home</a></li>
                <li><a href="/about">About</a></li>
                <li><a href="/services">Services</a></li>
                <li><a href="/contact">Contact</a></li>
            </ul>
        </nav>
    </header>

    <main class="content">
        <section class="hero-section">
            <div class="hero-content">
                <h2>Welcome to ${businessName}</h2>
                <p>Your trusted partner for quality service and exceptional experience.</p>
                <div class="cta-buttons">
                    <a href="/services" class="btn-primary">Our Services</a>
                    <a href="/contact" class="btn-secondary">Get In Touch</a>
                </div>
            </div>
        </section>

        <section class="features">
            <div class="container">
                <h3>Why Choose Us?</h3>
                <div class="feature-grid">
                    <div class="feature">
                        <h4>Quality Service</h4>
                        <p>We provide top-notch service with attention to detail.</p>
                    </div>
                    <div class="feature">
                        <h4>Professional Team</h4>
                        <p>Our experienced team is dedicated to your success.</p>
                    </div>
                    <div class="feature">
                        <h4>Customer Satisfaction</h4>
                        <p>Your satisfaction is our top priority.</p>
                    </div>
                </div>
            </div>
        </section>
    </main>

    <footer class="main-footer">
        <div class="footer-content">
            <p>&copy; 2024 ${businessName}. All rights reserved.</p>
            <div class="contact-info">
                <p>Phone: (555) 123-4567 | Email: info@${domain}</p>
            </div>
        </div>
    </footer>
</body>
</html>`;

      case 'domain2':
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>About ${businessName} | Our Story</title>
    <link rel="stylesheet" href="/css/main.css">
</head>
<body>
    <header class="main-header">
        <nav class="navigation">
            <div class="logo">
                <h1>${businessName}</h1>
            </div>
            <ul class="nav-menu">
                <li><a href="/">Home</a></li>
                <li><a href="/about" class="active">About</a></li>
                <li><a href="/services">Services</a></li>
                <li><a href="/contact">Contact</a></li>
            </ul>
        </nav>
    </header>

    <main class="content">
        <section class="page-header">
            <div class="container">
                <h1>About ${businessName}</h1>
                <p class="subtitle">Learn more about our story and mission</p>
            </div>
        </section>

        <section class="about-content">
            <div class="container">
                <div class="about-grid">
                    <div class="about-text">
                        <h2>Our Story</h2>
                        <p>Founded with a passion for excellence, ${businessName} has been serving our community with dedication and integrity. We believe in building lasting relationships with our customers through quality service and reliable solutions.</p>
                        
                        <h3>Our Mission</h3>
                        <p>To provide exceptional service while maintaining the highest standards of professionalism and customer care. We strive to exceed expectations in everything we do.</p>
                        
                        <h3>Our Values</h3>
                        <ul>
                            <li>Integrity in all our business dealings</li>
                            <li>Excellence in service delivery</li>
                            <li>Innovation and continuous improvement</li>
                            <li>Respect for our customers and community</li>
                        </ul>
                    </div>
                    
                    <div class="team-section">
                        <h2>Our Team</h2>
                        <p>We have a dedicated team of professionals committed to serving you better.</p>
                        
                        <div class="team-members">
                            <div class="team-member">
                                <h4>John Smith</h4>
                                <p>Founder & CEO</p>
                            </div>
                            <div class="team-member">
                                <h4>Sarah Johnson</h4>
                                <p>Operations Manager</p>
                            </div>
                            <div class="team-member">
                                <h4>Mike Wilson</h4>
                                <p>Customer Relations</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </main>

    <footer class="main-footer">
        <div class="footer-content">
            <p>&copy; 2024 ${businessName}. All rights reserved.</p>
        </div>
    </footer>
</body>
</html>`;

      case 'domain3':
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contact ${businessName} | Get In Touch</title>
    <link rel="stylesheet" href="/css/main.css">
</head>
<body>
    <header class="main-header">
        <nav class="navigation">
            <div class="logo">
                <h1>${businessName}</h1>
            </div>
            <ul class="nav-menu">
                <li><a href="/">Home</a></li>
                <li><a href="/about">About</a></li>
                <li><a href="/services">Services</a></li>
                <li><a href="/contact" class="active">Contact</a></li>
            </ul>
        </nav>
    </header>

    <main class="content">
        <section class="page-header">
            <div class="container">
                <h1>Contact Us</h1>
                <p class="subtitle">We'd love to hear from you</p>
            </div>
        </section>

        <section class="contact-content">
            <div class="container">
                <div class="contact-grid">
                    <div class="contact-info">
                        <h2>Get In Touch</h2>
                        
                        <div class="contact-item">
                            <h3>📍 Address</h3>
                            <p>123 Main Street<br>
                            City, State 12345<br>
                            United States</p>
                        </div>
                        
                        <div class="contact-item">
                            <h3>📞 Phone</h3>
                            <p><a href="tel:+15551234567">(555) 123-4567</a></p>
                        </div>
                        
                        <div class="contact-item">
                            <h3>✉️ Email</h3>
                            <p><a href="mailto:info@${domain}">info@${domain}</a></p>
                        </div>
                        
                        <div class="contact-item">
                            <h3>🌐 Website</h3>
                            <p><a href="https://${domain}" target="_blank">${domain}</a></p>
                        </div>
                    </div>
                    
                    <div class="contact-form">
                        <h2>Send Us a Message</h2>
                        <form action="/contact" method="post">
                            <div class="form-group">
                                <label for="name">Full Name *</label>
                                <input type="text" id="name" name="name" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="email">Email Address *</label>
                                <input type="email" id="email" name="email" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="phone">Phone Number</label>
                                <input type="tel" id="phone" name="phone">
                            </div>
                            
                            <div class="form-group">
                                <label for="subject">Subject *</label>
                                <input type="text" id="subject" name="subject" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="message">Message *</label>
                                <textarea id="message" name="message" rows="5" required></textarea>
                            </div>
                            
                            <button type="submit" class="btn-primary">Send Message</button>
                        </form>
                    </div>
                </div>

                <section class="business-hours">
                    <h2>Business Hours</h2>
                    <div class="hours-grid">
                        <div class="hours-item">
                            <span class="day">Monday - Friday</span>
                            <span class="time">9:00 AM - 6:00 PM</span>
                        </div>
                        <div class="hours-item">
                            <span class="day">Saturday</span>
                            <span class="time">10:00 AM - 4:00 PM</span>
                        </div>
                        <div class="hours-item">
                            <span class="day">Sunday</span>
                            <span class="time">Closed</span>
                        </div>
                    </div>
                </section>
            </div>
        </section>
    </main>

    <footer class="main-footer">
        <div class="footer-content">
            <p>&copy; 2024 ${businessName}. All rights reserved.</p>
        </div>
    </footer>
</body>
</html>`;

      default:
        return '<p>No placeholder content available for this page type.</p>';
    }
  }
}