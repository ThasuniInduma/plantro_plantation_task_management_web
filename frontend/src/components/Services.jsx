import React from 'react';
import './Services.css';
import { FaClipboardList, FaUsers, FaLeaf, FaChartLine } from 'react-icons/fa';

const Services = () => {
  const serviceItems = [
    { 
      icon: <FaClipboardList className="service-icon" />, 
      title: 'Real-Time Task & Allocation', 
      description: 'Digitally assign tasks, track worker progress live, and manage resource distribution across all fields for maximum efficiency.' 
    },
    { 
      icon: <FaUsers className="service-icon" />, 
      title: 'Workforce & Attendance', 
      description: 'Manage worker profiles, log daily attendance, and ensure seamless workforce deployment with instant accountability checks.' 
    },
    { 
      icon: <FaLeaf className="service-icon" />, 
      title: 'Crop & Field Management', 
      description: 'Maintain detailed digital records of crop cycles, field maintenance schedules, and historical yield data for future planning.' 
    },
    { 
      icon: <FaChartLine className="service-icon" />, 
      title: 'Harvest & Performance Reports', 
      description: 'Generate accurate, transparent reports on harvest yield, individual worker performance, and operational KPIs instantly.' 
    },
  ];

  return (
    <section id="services" className="services-section">
      <div className="services-container">
        <h2 className="section-title">Your Digital Plantation Command Center</h2>
        <p className="section-subtitle">A suite of powerful tools designed to bring precision and efficiency to every stage of your agricultural operation.</p>
        
        <div className="services-grid">
          {serviceItems.map((item, index) => (
            <div className="service-card" key={index}>
              <div className="icon-wrapper">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          ))}
        </div>

        <a href="#demo" className="services-cta-button">
          Explore All Modules →
        </a>
      </div>
    </section>
  );
};

export default Services;