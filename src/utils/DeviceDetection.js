// src/utils/DeviceDetection.js

class DeviceDetection {
    static detectDevice() {
        const userAgent = navigator.userAgent;
        const platform = navigator.platform;

        const isMobile = /Mobi|Android/i.test(userAgent);
        const isTablet = /Tablet|iPad/i.test(userAgent);
        const isTV = /TV|SmartTV/i.test(userAgent);
        const isFireTV = /FireTV/i.test(userAgent);
        const isAndroid = /Android/i.test(userAgent);
        const isIPad = /iPad/i.test(userAgent);
        const isIOS = /iPhone|iPad|iPod/i.test(userAgent) && !window.MSStream;
        const isDesktop = !isMobile && !isTablet && !isTV;

        return {
            userAgent,
            platform,
            isMobile,
            isTablet,
            isTV,
            isFireTV,
            isAndroid,
            isIPad,
            isIOS,
            isDesktop,
        };
    }
}

export default DeviceDetection;
