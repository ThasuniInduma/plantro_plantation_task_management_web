import React, { useState } from 'react'
import { assets } from '../assets/assets'
import { Link, useNavigate } from 'react-router-dom'
import './Navbar.css'



const Navbar = () => {
    const [menu, setMenu] = useState("home")
    const navigate = useNavigate()

    return (
        <div className='navbar'>
            <Link to='/' >
                <img className='logo' src={assets.plantro} alt="" />
            </Link>
            <ul className='navbar-menu'>
                <Link onClick={()=>setMenu("home")} className={menu==="home"?"active":""}>Home</Link>
                <a href='#services' onClick={()=>setMenu("services")} className={menu==="services"?"active":""}>Services</a>
                <a href='#about' onClick={()=>setMenu("about")} className={menu==="about"?"active":""}>About</a>
                <a href='#contact' onClick={()=>setMenu("contact")} className={menu==="contact"?"active":""}>Contact</a>
            </ul>
            <button onClick={() => navigate('/login')}>Sign In</button>
        </div>
    )
}

export default Navbar
