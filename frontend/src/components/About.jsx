import React from 'react';
import './About.css';
import { FaChartBar, FaCalendarCheck, FaClock } from 'react-icons/fa';
import {assets} from '../assets/assets'

const About = () => {
  

  return (
    <section id="about" className="about-section">
      <div className="about-container">
        
        <div className="about-content-side">
          <p className="about-tag">ABOUT PLANTRO</p>
          <h2 className="about-title">Driving Productivity and Transparency in Agriculture</h2>
          <p className="about-description">
            We understand the challenges of modern plantation management. Our system is built to provide complete visibility into field operations, enabling supervisors to manage workforce attendance, task distribution, and harvest reports with unprecedented ease and accuracy.
          </p>
          
          <p className="about-quote">
            "Turning complex field logistics into simple, actionable data - that's the core promise of our platform."
          </p>

        </div>

        {/* Stats/Data Side */}
        <div className="about-stats-side">
          <div className="stats-box">
            <img src={assets.header2} alt="Plantation" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;