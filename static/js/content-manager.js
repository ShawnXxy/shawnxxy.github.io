/**
 * Content Manager - Handles dynamic content loading and styling
 */
class ContentManager {
    constructor() {
        this.contentData = null;
        this.stylingRules = null;
    }

    /**
     * Load content data from JSON file
     */
    async loadContentData() {
        try {
            const response = await fetch('../data/about-content.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.contentData = data.sections;
            this.stylingRules = data.styling;
            return data;
        } catch (error) {
            console.error('Failed to load content data:', error);
            return null;
        }
    }

    /**
     * Apply styling using DOM manipulation instead of innerHTML
     */
    applyStyleToText(text, container) {
        // Clear container
        container.innerHTML = '';
        
        let currentText = text;
        
        // Apply first letter styling
        if (this.stylingRules?.firstLetterRule?.enabled) {
            const firstChar = currentText.charAt(0);
            const restOfText = currentText.slice(1);
            
            // Create first letter span
            const firstLetterSpan = document.createElement('span');
            firstLetterSpan.className = this.stylingRules.firstLetterRule.className;
            firstLetterSpan.textContent = firstChar;
            
            container.appendChild(firstLetterSpan);
            currentText = restOfText;
        }
        
        // Process remaining text for punctuation
        if (this.stylingRules?.punctuationRule?.enabled) {
            const punctuationChars = this.stylingRules.punctuationRule.characters;
            const className = this.stylingRules.punctuationRule.className;
            
            // Split text by punctuation
            let lastIndex = 0;
            for (let i = 0; i < currentText.length; i++) {
                const char = currentText[i];
                if (punctuationChars.includes(char)) {
                    // Add text before punctuation
                    if (i > lastIndex) {
                        const textNode = document.createTextNode(currentText.slice(lastIndex, i));
                        container.appendChild(textNode);
                    }
                    
                    // Add highlighted punctuation
                    const punctSpan = document.createElement('span');
                    punctSpan.className = className;
                    punctSpan.textContent = char;
                    container.appendChild(punctSpan);
                    
                    lastIndex = i + 1;
                }
            }
            
            // Add remaining text
            if (lastIndex < currentText.length) {
                const textNode = document.createTextNode(currentText.slice(lastIndex));
                container.appendChild(textNode);
            }
        } else {
            // No punctuation styling, just add the text
            const textNode = document.createTextNode(currentText);
            container.appendChild(textNode);
        }
    }

    /**
     * Render "Who am I" section using DOM manipulation
     */
    renderWhoAmISection() {
        console.log('Content Manager: Rendering Who Am I section...');
        
        if (!this.contentData?.whoAmI) {
            console.error('No whoAmI data found');
            return;
        }

        // Find container
        let container = document.querySelector('#who-am-i-content');
        if (!container) {
            container = document.querySelector('.col-md-7.animated.fadeInUp');
        }
        
        if (!container) {
            console.error('Who Am I container not found');
            return;
        }

        console.log('Found container:', container);

        // Clear container
        container.innerHTML = '';

        const content = this.contentData.whoAmI.content;
        console.log('Content to render:', content);

        // Create each line with styling
        content.forEach((text, index) => {
            // Create a container for this line
            const lineDiv = document.createElement('div');
            lineDiv.style.display = 'inline';
            
            // Apply styling to this line
            this.applyStyleToText(text, lineDiv);
            
            // Add to main container
            container.appendChild(lineDiv);
            
            // Add line break if not the last item
            if (index < content.length - 1) {
                container.appendChild(document.createElement('br'));
            }
        });

        console.log('Who Am I section rendered successfully');
        console.log('Final container content:', container.innerHTML);
    }

    /**
     * Render personal info section
     */
    renderPersonalInfoSection() {
        console.log('Content Manager: Rendering Personal Info section...');
        
        if (!this.contentData?.personalInfo) {
            console.error('No personalInfo data found');
            return;
        }

        const container = document.querySelector('.info-list, #personal-info-content');
        if (!container) {
            console.error('Personal Info container not found');
            return;
        }

        const info = this.contentData.personalInfo;
        container.innerHTML = '';

        // Create list items
        const items = [
            { label: 'Legal Name', value: info.legalName },
            { label: 'Preferred Name', value: info.preferredName },
            { label: 'Date of birth', value: info.dateOfBirth },
            { label: 'Email', value: info.email, isEmail: true }
        ];

        items.forEach(item => {
            const li = document.createElement('li');
            const strong = document.createElement('strong');
            strong.textContent = `${item.label} : `;
            li.appendChild(strong);
            
            if (item.isEmail) {
                const emailLink = document.createElement('a');
                emailLink.href = `mailto:${item.value}`;
                emailLink.textContent = item.value;
                li.appendChild(emailLink);
            } else {
                li.appendChild(document.createTextNode(item.value));
            }
            
            container.appendChild(li);
        });

        // Add phones
        if (info.phones && info.phones.length > 0) {
            const phoneLi = document.createElement('li');
            const phoneStrong = document.createElement('strong');
            phoneStrong.textContent = 'Phone : ';
            phoneLi.appendChild(phoneStrong);
            
            info.phones.forEach((phone, index) => {
                const phoneLink = document.createElement('a');
                const cleanPhone = phone.replace(/[\s.-]/g, '');
                phoneLink.href = `tel:${cleanPhone}`;
                
                // Apply punctuation styling to phone
                const phoneDiv = document.createElement('div');
                phoneDiv.style.display = 'inline';
                this.applyStyleToText(phone, phoneDiv);
                phoneLink.appendChild(phoneDiv);
                
                phoneLi.appendChild(phoneLink);
                
                if (index < info.phones.length - 1) {
                    const separator = document.createElement('span');
                    separator.className = 'punctuation-highlight';
                    separator.textContent = '/';
                    phoneLi.appendChild(separator);
                }
            });
            
            container.appendChild(phoneLi);
        }

        console.log('Personal Info section rendered successfully');
    }

    /**
     * Render know-how section
     */
    renderKnowHowSection() {
        console.log('Content Manager: Rendering Know-How section...');
        
        if (!this.contentData?.knowHow) {
            console.error('No knowHow data found');
            return;
        }

        const leftContainer = document.querySelector('#knowhow-left');
        const rightContainer = document.querySelector('#knowhow-right');
        
        if (!leftContainer || !rightContainer) {
            console.error('Know-How containers not found');
            return;
        }

        const knowHow = this.contentData.knowHow;
        const midPoint = Math.ceil(knowHow.length / 2);
        
        // Split into two columns
        const leftColumn = knowHow.slice(0, midPoint);
        const rightColumn = knowHow.slice(midPoint);

        leftContainer.innerHTML = '';
        rightContainer.innerHTML = '';

        leftColumn.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            leftContainer.appendChild(li);
        });

        rightColumn.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            rightContainer.appendChild(li);
        });

        console.log('Know-How section rendered successfully');
    }

    /**
     * Render showcase section
     */
    renderShowcaseSection() {
        console.log('Content Manager: Rendering Showcase section...');
        
        if (!this.contentData?.showcase) {
            console.error('No showcase data found');
            return;
        }

        const container = document.querySelector('#showcase-content');
        if (!container) {
            console.error('Showcase container not found');
            return;
        }

        container.innerHTML = '';

        this.contentData.showcase.forEach(project => {
            const expDiv = document.createElement('div');
            expDiv.className = 'exp animated fadeInUp';
            
            // Create header
            const hgroup = document.createElement('div');
            hgroup.className = 'hgroup';
            
            const h4 = document.createElement('h4');
            const projectLink = document.createElement('a');
            projectLink.href = project.url;
            projectLink.target = '_blank';
            projectLink.rel = 'noopener';
            projectLink.textContent = project.title;
            
            h4.appendChild(projectLink);
            
            const colon = document.createElement('span');
            colon.className = 'punctuation-highlight';
            colon.textContent = ':';
            h4.appendChild(colon);
            
            h4.appendChild(document.createTextNode(` ${project.description}`));
            hgroup.appendChild(h4);
            expDiv.appendChild(hgroup);
            
            // Create details
            const p = document.createElement('p');
            const ul = document.createElement('ul');
            
            project.details.forEach(detail => {
                const li = document.createElement('li');
                this.applyStyleToText(detail, li);
                ul.appendChild(li);
            });
            
            p.appendChild(ul);
            expDiv.appendChild(p);
            container.appendChild(expDiv);
        });

        console.log('Showcase section rendered successfully');
    }

    /**
     * Render experience section
     */
    renderExperienceSection() {
        console.log('Content Manager: Rendering Experience section...');
        
        if (!this.contentData?.experience) {
            console.error('No experience data found');
            return;
        }

        const container = document.querySelector('#experience-content');
        if (!container) {
            console.error('Experience container not found');
            return;
        }

        container.innerHTML = '';

        this.contentData.experience.forEach(exp => {
            const expDiv = document.createElement('div');
            expDiv.className = 'exp animated fadeInUp';
            
            // Create header
            const hgroup = document.createElement('div');
            hgroup.className = 'hgroup';
            
            const h4 = document.createElement('h4');
            h4.textContent = exp.title;
            hgroup.appendChild(h4);
            
            const h5 = document.createElement('h5');
            const periodDiv = document.createElement('div');
            periodDiv.style.display = 'inline';
            this.applyStyleToText(exp.period, periodDiv);
            h5.appendChild(periodDiv);
            hgroup.appendChild(h5);
            
            expDiv.appendChild(hgroup);
            
            // Create details
            const p = document.createElement('p');
            const ul = document.createElement('ul');
            
            exp.details.forEach(detail => {
                const li = document.createElement('li');
                this.applyStyleToText(detail, li);
                ul.appendChild(li);
            });
            
            p.appendChild(ul);
            expDiv.appendChild(p);
            container.appendChild(expDiv);
        });

        console.log('Experience section rendered successfully');
    }

    /**
     * Render education section
     */
    renderEducationSection() {
        console.log('Content Manager: Rendering Education section...');
        
        if (!this.contentData?.education) {
            console.error('No education data found');
            return;
        }

        const container = document.querySelector('#education-content');
        if (!container) {
            console.error('Education container not found');
            return;
        }

        container.innerHTML = '';

        this.contentData.education.forEach(edu => {
            const expDiv = document.createElement('div');
            expDiv.className = 'exp animated fadeInUp';
            
            // Create header
            const hgroup = document.createElement('div');
            hgroup.className = 'hgroup';
            
            const h4 = document.createElement('h4');
            h4.textContent = `${edu.degree} `;
            
            const dash = document.createElement('span');
            dash.className = 'punctuation-highlight';
            dash.textContent = '–';
            h4.appendChild(dash);
            h4.appendChild(document.createTextNode(' '));
            
            // Handle institution links
            if (edu.institutionUrl2) {
                const institutions = edu.institution.split(' & ');
                if (institutions.length === 2) {
                    const link1 = document.createElement('a');
                    link1.href = edu.institutionUrl;
                    link1.target = '_blank';
                    link1.rel = 'noopener';
                    link1.textContent = institutions[0];
                    h4.appendChild(link1);
                    
                    const ampersand = document.createElement('span');
                    ampersand.className = 'punctuation-highlight';
                    ampersand.textContent = ' & ';
                    h4.appendChild(ampersand);
                    
                    const link2 = document.createElement('a');
                    link2.href = edu.institutionUrl2;
                    link2.target = '_blank';
                    link2.rel = 'noopener';
                    link2.textContent = institutions[1];
                    h4.appendChild(link2);
                }
            } else {
                const instLink = document.createElement('a');
                instLink.href = edu.institutionUrl;
                instLink.target = '_blank';
                instLink.rel = 'noopener';
                instLink.textContent = edu.institution;
                h4.appendChild(instLink);
            }
            
            hgroup.appendChild(h4);
            
            const h5 = document.createElement('h5');
            const periodDiv = document.createElement('div');
            periodDiv.style.display = 'inline';
            this.applyStyleToText(edu.period, periodDiv);
            h5.appendChild(periodDiv);
            hgroup.appendChild(h5);
            
            expDiv.appendChild(hgroup);
            container.appendChild(expDiv);
        });

        console.log('Education section rendered successfully');
    }

    /**
     * Initialize
     */
    async init() {
        console.log('Content Manager: Initializing...');
        await this.loadContentData();
        
        if (!this.contentData) {
            console.error('Failed to load content data');
            return;
        }

        console.log('Data loaded, rendering all sections...');
        console.log('Content data:', this.contentData);
        
        // Wait for DOM to be ready
        setTimeout(() => {
            this.renderWhoAmISection();
            this.renderPersonalInfoSection();
            this.renderKnowHowSection();
            this.renderShowcaseSection();
            this.renderExperienceSection();
            this.renderEducationSection();
            console.log('All sections rendered successfully');
        }, 500);
    }
}

// Global instance
window.ContentManager = ContentManager;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    window.ContentManager = new ContentManager();
    await window.ContentManager.init();
});
