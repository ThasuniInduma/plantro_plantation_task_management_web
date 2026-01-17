import React from 'react';
import './About.css';
import { FaChartBar, FaCalendarCheck, FaClock } from 'react-icons/fa';

const About = () => {
  const stats = [
    { icon: <FaChartBar />, value: '+35%', label: 'Yield Reporting Accuracy' },
    { icon: <FaCalendarCheck />, value: '99%', label: 'Task Completion Rate' },
    { icon: <FaClock />, value: '10 hrs/wk', label: 'Paperwork Time Saved' },
  ];

  return (
    <section id="about" className="about-section">
      <div className="about-container">
        
        <div className="about-content-side">
          <p className="about-tag">ABOUT PLANTRO</p>
          <h2 className="about-title">Driving Productivity and Transparency in Agriculture</h2>
          <p className="about-description">
            We understand the challenges of modern plantation management. Our system is built to provide complete **visibility** into field operations, enabling supervisors to manage workforce attendance, task distribution, and harvest reports with unprecedented ease and **accuracy**.
          </p>
          
          <p className="about-quote">
            "Turning complex field logistics into simple, actionable data—that's the core promise of our platform."
          </p>

          <a href="#contact" className="cta-button-about">
            Learn Our Story
          </a>
        </div>

        {/* Stats/Data Side */}
        <div className="about-stats-side">
          <div className="stats-box">
            {stats.map((stat, index) => (
              <div className="stat-item" key={index}>
                <div className="stat-icon-wrapper">{stat.icon}</div>
                <p className="stat-value">{stat.value}</p>
                <p className="stat-label">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;