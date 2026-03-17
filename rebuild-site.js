const fs = require('fs');
const path = require('path');

const pages = [
  { slug: 'index.html', title: 'WebStack - Learn Web Development', heading: 'Build Skills for the Modern Web', subtitle: 'Learn HTML, CSS, JavaScript, and more with interactive tutorials.', callToAction: { text: 'Browse Courses', href: 'courses.html' } },
  { slug: 'about.html', title: 'About WebStack', heading: 'About WebStack', subtitle: 'A friendly place to learn web development.', callToAction: null },
  { slug: 'courses.html', title: 'Courses', heading: 'Courses', subtitle: 'Choose a course to begin.', callToAction: null },
  { slug: 'contact.html', title: 'Contact Us', heading: 'Contact Us', subtitle: 'Have questions? Reach out and we will help.', callToAction: null },
  { slug: 'faq.html', title: 'FAQ', heading: 'Frequently Asked Questions', subtitle: 'Common questions and answers.', callToAction: null },
  { slug: 'terms.html', title: 'Terms of Service', heading: 'Terms of Service', subtitle: 'The rules you agree to when using WebStack.', callToAction: null },
  { slug: 'privacy.html', title: 'Privacy Policy', heading: 'Privacy Policy', subtitle: 'How we handle your data.', callToAction: null },
  { slug: 'team.html', title: 'Our Team', heading: 'Our Team', subtitle: 'Meet the people behind WebStack.', callToAction: null },
  { slug: 'dashboard.html', title: 'Dashboard', heading: 'Your Dashboard', subtitle: 'Track your progress and explore new courses.', callToAction: null },
  { slug: 'profile.html', title: 'Profile', heading: 'Your Profile', subtitle: 'Update your profile information.', callToAction: null },
  { slug: 'leaderboard.html', title: 'Leaderboard', heading: 'Leaderboard', subtitle: 'See how you rank among other learners.', callToAction: null },
  { slug: 'enroll.html', title: 'Enroll', heading: 'Enroll in a Course', subtitle: 'Choose a course to enroll in.', callToAction: null },
  { slug: 'exercises.html', title: 'Exercises', heading: 'Exercises', subtitle: 'Practice your skills with real exercises.', callToAction: null },
  { slug: 'tutorials.html', title: 'Tutorials', heading: 'Tutorials', subtitle: 'Step-by-step guides to build projects.', callToAction: null },
  { slug: 'tutorial-start.html', title: 'Get Started', heading: 'Start Learning', subtitle: 'Begin your first tutorial.', callToAction: null },
];

function renderNav() {
  return `
    <button class="hamburger-menu" id="hamburger" aria-label="Toggle navigation">
      <span></span>
      <span></span>
      <span></span>
    </button>
    <nav id="nav-menu"></nav>
  `;
}

function renderFooter() {
  return `
  <footer>
    <div class="footer-content">
      <div class="footer-section">
        <h4>About</h4>
        <ul>
          <li><a href="about.html">About Us</a></li>
          <li><a href="team.html">Our Team</a></li>
          <li><a href="#">Careers</a></li>
        </ul>
      </div>
      <div class="footer-section">
        <h4>Legal</h4>
        <ul>
          <li><a href="privacy.html">Privacy Policy</a></li>
          <li><a href="terms.html">Terms of Service</a></li>
          <li><a href="contact.html">Contact Us</a></li>
        </ul>
      </div>
      <div class="footer-section">
        <h4>Follow Us</h4>
        <ul>
          <li><a href="#twitter">Twitter</a></li>
          <li><a href="#facebook">Facebook</a></li>
          <li><a href="#github">GitHub</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; ${new Date().getFullYear()} WebStack. All rights reserved.</p>
    </div>
  </footer>
  `;
}

function pageHtml(page) {
  const hero = page.callToAction ? `
    <section class="hero">
      <div class="hero-content">
        <h2>${page.heading}</h2>
        <p>${page.subtitle}</p>
        <a class="btn btn-primary btn-large" href="${page.callToAction.href}">${page.callToAction.text}</a>
      </div>
    </section>
  ` : `
    <section class="page-hero">
      <div class="page-hero__content">
        <h2>${page.heading}</h2>
        <p>${page.subtitle}</p>
      </div>
    </section>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.title}</title>
  <link rel="stylesheet" href="styles.css">
  <script>
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
  </script>
</head>
<body>
  <header>
    <div class="header-container">
      <div class="logo">
        <h1><a href="index.html">WebStack</a></h1>
      </div>
      ${renderNav()}
    </div>
  </header>

  <main>
    ${hero}
    <section class="content">
      <div class="content-inner">
        <p>This is the ${page.title} page. Update this content as needed.</p>
      </div>
    </section>
  </main>

  ${renderFooter()}

  <script src="site.js"></script>
</body>
</html>
`;
}

pages.forEach(page => {
  const filePath = path.join(__dirname, page.slug);
  fs.writeFileSync(filePath, pageHtml(page), 'utf8');
  console.log('Wrote', page.slug);
});
