import React from 'react';
import './Header.css';

const Header = () => {

  return (
    <div className='hero-container'>
      <div className='hero-overlay'>
        <h1 className='main'>
          Plantro
        </h1><br />
        <h1 className='main-title'>
          Turning Tasks into Growth, Daily
        </h1>
        <p className='subtitle'>
          Tasks, workers, and schedules synchronize to create smooth, efficient plantation operations
        </p>
        <button className='start'>Get Start</button>
      </div>
    </div>
  );
};

export default Header;