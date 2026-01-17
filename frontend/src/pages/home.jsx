import React from 'react'
import Navbar from '../components/Navbar'
import Header from '../components/Header'
import Services from '../components/Services'
import About from '../components/About'
import Footer from '../components/Footer'

const Home = () => {
  return (
    <div className='min-h-screen w-full overflow-x-hidden'>
      <Navbar/>
      <Header/>
      <Services/>
      <About/>
      <Footer/>
    </div>
  )
}

export default Home