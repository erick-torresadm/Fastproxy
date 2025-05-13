document.addEventListener('DOMContentLoaded', function() {
    // Tema Dark/Light
    const themeToggle = document.querySelector('.theme-toggle');
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    if (themeToggle) {
        // Aplicar tema salvo
        document.documentElement.setAttribute('data-theme', currentTheme);
        updateThemeToggleIcon(currentTheme);
        
        themeToggle.addEventListener('click', function() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeToggleIcon(newTheme);
        });
    }
    
    function updateThemeToggleIcon(theme) {
        const themeIcon = document.querySelector('.theme-toggle i');
        if (themeIcon) {
            if (theme === 'dark') {
                themeIcon.classList.remove('fa-moon');
                themeIcon.classList.add('fa-sun');
            } else {
                themeIcon.classList.remove('fa-sun');
                themeIcon.classList.add('fa-moon');
 