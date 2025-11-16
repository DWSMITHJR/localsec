// src/components/TabBar.jsx
import React from 'react';

const TabBar = ({ activeTab, onTabChange }) => {
    const handleTabClick = (tab) => {
        onTabChange(tab);
    };

    return (
        <div className="tab-bar">
            <button
                className={`tab-button ${activeTab === 'passwords' ? 'active' : ''}`}
                onClick={() => handleTabClick('passwords')}
            >
                Passwords
            </button>
            <button
                className={`tab-button ${activeTab === 'credentials' ? 'active' : ''}`}
                onClick={() => handleTabClick('credentials')}
            >
                Credentials
            </button>
            <button
                className={`tab-button ${activeTab === 'keypairs' ? 'active' : ''}`}
                onClick={() => handleTabClick('keypairs')}
            >
                Key Pairs
            </button>
            <button
                className={`tab-button ${activeTab === 'cloudsync' ? 'active' : ''}`}
                onClick={() => handleTabClick('cloudsync')}
            >
                Cloud Sync
            </button>
            <button
                className={`tab-button ${activeTab === 'analysis' ? 'active' : ''}`}
                onClick={() => handleTabClick('analysis')}
            >
                Security Analysis
            </button>
        </div>
    );
};

export default TabBar;
