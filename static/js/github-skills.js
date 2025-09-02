/**
 * GitHub Skills Integration for Static Sites
 * Loads pre-generated language data from static JSON files
 * Perfect for GitHub Pages deployment
 */

class GitHubSkills {
    constructor() {
        this.dataUrl = './data/github-languages.json'; // Static JSON file
        this.skillsContainer = document.getElementById('technical-skills');
        this.maxSkills = 8; // Limit to top 8 skills for display
        this.minPercent = 1; // Filter out skills with less than 1% usage
    }

    /**
     * Initialize the GitHub skills loading
     */
    async init() {
        try {
            await this.loadLanguageData();
        } catch (error) {
            this.handleError('Failed to load language data: ' + error.message);
        }
    }

    /**
     * Load language data from static JSON file
     */
    async loadLanguageData() {
        try {
            this.showLoadingMessage();
            
            const response = await fetch(this.dataUrl);
            if (!response.ok) {
                throw new Error(`Failed to load language data: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.languages && Array.isArray(data.languages)) {
                const processedSkills = this.formatLanguageData(data.languages);
                this.renderSkills(processedSkills);
                this.displayMetadata(data);
            } else {
                throw new Error('Invalid data format in language file');
            }
            
        } catch (error) {
            console.error('Error loading static language data:', error);
            this.handleError('Unable to load programming language data. Please run the build script to generate language data.');
        }
    }

    /**
     * Format language data for display
     */
    formatLanguageData(languages) {
        return languages.map(lang => ({
            name: this.formatLanguageName(lang.name),
            percent: lang.percent,
            bytes: lang.bytes
        }));
    }

    /**
     * Aggregate language data from all repositories
     * @param {Array} languageResults - Array of language data objects
     */
    aggregateLanguageData(languageResults) {
        this.languageData = {};
        
        languageResults.forEach(repoLanguages => {
            Object.entries(repoLanguages).forEach(([language, bytes]) => {
                if (this.languageData[language]) {
                    this.languageData[language] += bytes;
                } else {
                    this.languageData[language] = bytes;
                }
            });
        });
    }

    /**
     * Calculate percentages for each language
     * @returns {Array} Processed skills data
     */
    calculateLanguagePercentages() {
        const totalBytes = Object.values(this.languageData).reduce((sum, bytes) => sum + bytes, 0);
        
        if (totalBytes === 0) {
            return [];
        }

        return Object.entries(this.languageData)
            .map(([language, bytes]) => ({
                name: this.formatLanguageName(language),
                percent: (bytes / totalBytes) * 100,
                bytes: bytes
            }))
            .filter(skill => skill.percent >= this.minPercent)
            .sort((a, b) => b.percent - a.percent)
            .slice(0, this.maxSkills);
    }

    /**
     * Format language name for display
     * @param {string} language - Raw language name
     * @returns {string} Formatted language name
     */
    formatLanguageName(language) {
        // Handle special cases for display
        const nameMap = {
            'TypeScript': 'TypeScript',
            'JavaScript': 'JavaScript',
            'HTML': 'HTML<span id="puncsign">&amp;</span>CSS',
            'CSS': 'HTML<span id="puncsign">&amp;</span>CSS',
            'C#': 'C<span id="puncsign">#</span>',
            'C++': 'C<span id="puncsign">++</span>',
            'Python': 'Python',
            'Java': 'Java',
            'PHP': 'PHP',
            'Shell': 'Shell Scripts',
            'PowerShell': 'PowerShell',
            'Dockerfile': 'Docker',
            'JSON': 'JSON',
            'YAML': 'YAML',
            'Markdown': 'Markdown'
        };

        return nameMap[language] || language;
    }

    /**
     * Show loading message
     */
    showLoadingMessage() {
        this.skillsContainer.innerHTML = `
            <div class="loading-message">
                <i class="fa fa-spinner fa-spin"></i> Loading skills from GitHub...
            </div>
        `;
    }

    /**
     * Display metadata about the language data
     */
    displayMetadata(data) {
        if (data.lastUpdated) {
            const updateDate = new Date(data.lastUpdated).toLocaleDateString();
            console.log(`GitHub language data last updated: ${updateDate}`);
            console.log(`Total repositories analyzed: ${data.totalRepositories || 'unknown'}`);
        }
    }

    /**
     * Render skills as progress bars
     * @param {Array} skills - Processed skills data
     */
    renderSkills(skills) {
        if (skills.length === 0) {
            this.skillsContainer.innerHTML = '<div class="no-skills-message">No programming language data found</div>';
            return;
        }

        const skillsHTML = skills.map(skill => this.createSkillHTML(skill)).join('');
        
        // Add fade-out effect before updating content
        this.skillsContainer.style.opacity = '0.5';
        
        setTimeout(() => {
            this.skillsContainer.innerHTML = skillsHTML;
            this.skillsContainer.style.opacity = '1';
            this.animateProgressBars();
        }, 300);

        // Only save data for debugging when we have raw data (not when loading static files)
        if (this.languageData) {
            this.saveLanguageData(skills);
        }
    }

    /**
     * Create HTML for a single skill progress bar
     * @param {Object} skill - Skill data
     * @returns {string} HTML string
     */
    createSkillHTML(skill) {
        const displayPercent = Math.round(skill.percent);
        
        return `
            <label class="progress-bar-label">${skill.name}</label>
            <div class="progress">
                <div style="width: ${displayPercent}%;" 
                     class="progress-bar six-sec-ease-in-out" 
                     role="progressbar" 
                     aria-valuenow="${displayPercent}" 
                     aria-valuemin="0" 
                     aria-valuemax="100">
                    <span class="loading">${displayPercent}%</span>
                </div>
            </div>
        `;
    }

    /**
     * Animate progress bars (if animation CSS exists)
     */
    animateProgressBars() {
        const progressBars = this.skillsContainer.querySelectorAll('.progress-bar');
        progressBars.forEach((bar, index) => {
            setTimeout(() => {
                bar.style.width = bar.style.width; // Trigger animation
            }, index * 100);
        });
    }

    /**
     * Save language data as JSON for reference
     * @param {Array} skills - Processed skills data
     */
    saveLanguageData(skills) {
        const dataToSave = {
            lastUpdated: new Date().toISOString(),
            totalRepositories: this.languageData ? Object.keys(this.languageData).length : 'unknown',
            languages: skills,
            rawData: this.languageData || null
        };
        
        console.log('GitHub Language Data:', dataToSave);
        
        // Store in localStorage for debugging
        try {
            localStorage.setItem('github-language-data', JSON.stringify(dataToSave));
        } catch (error) {
            console.warn('Could not save to localStorage:', error);
        }
    }

    /**
     * Handle API errors
     * @param {string} error - Error message
     */
    handleError(error) {
        console.error('GitHub API Error:', error);
        this.skillsContainer.innerHTML = `
            <div class="error-message">
                <i class="fa fa-exclamation-triangle"></i> Unable to load programming language data from GitHub
                <br><small>${error}</small>
            </div>
        `;
    }
}

// Initialize GitHub skills when DOM is ready
$(document).ready(function() {
    const githubSkills = new GitHubSkills();
    githubSkills.init();
});
