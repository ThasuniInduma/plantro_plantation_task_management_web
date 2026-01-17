import React from 'react';
import './Footer.css';
import { FaLeaf, FaMapMarkerAlt, FaEnvelope, FaPhone } from 'react-icons/fa';
import { assets } from '../assets/assets';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="main-footer" id='contact'>
      <div className="footer-container">
        <div className="footer-column branding-col">
            <img src={assets.plantro} className="footer-logo" alt="" />

          <p className="footer-tagline">Digital tools for a greener future. Managing plantations efficiently.</p>
        </div>

        <div className="footer-column nav-links-col">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="#home">Home</a></li>
            <li><a href="#services">Services</a></li>
            <li><a href="#about">About Us</a></li>
            <li><a href="/login">Login/Sign Up</a></li>
          </ul>
        </div>

        <div className="footer-column contact-col">
          <h4>Contact Us</h4>
          <p><FaMapMarkerAlt /> 123 Plantation Rd, Colombo, Sri Lanka</p>
          <p><FaEnvelope /> support@plantro.com</p>
          <p><FaPhone /> +94 71 123 4567</p>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {currentYear} Plantro. All rights reserved. | Built for BSc.IT IM/2022/091</p>
      </div>
    </footer>
  );
};

export default Footer;