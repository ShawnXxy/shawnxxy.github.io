/**
 * GitHub Language Data Generator
 * This script runs locally to fetch language data using GitHub API with authentication
 * and generates static JSON files that can be served by GitHub Pages
 */

const { Octokit } = require('@octokit/core');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class LanguageDataGenerator {
    constructor() {
        // Validate that we have a token
        if (!process.env.git_token) {
            throw new Error('GitHub token (git_token) is required but not found in environment variables');
        }
        
        this.octokit = new Octokit({
            auth: process.env.git_token
        });
        this.outputDir = path.join(__dirname, '../data');
        this.username = 'ShawnXxy';
        
        console.log(`🔑 Using GitHub API with token: ${process.env.git_token.substring(0, 8)}...`);
    }

    /**
     * Generate language data and save to static files
     */
    async generate() {
        try {
            console.log('🚀 Generating GitHub language data...');
            
            // Ensure output directory exists
            if (!fs.existsSync(this.outputDir)) {
                fs.mkdirSync(this.outputDir, { recursive: true });
            }

            // Fetch repositories
            console.log('📁 Fetching repositories...');
            const repos = await this.fetchRepositories();
            console.log(`   Found ${repos.length} repositories`);

            // Fetch language data for each repository
            console.log('💻 Fetching language data...');
            const languageData = await this.fetchLanguageData(repos);

            // Calculate percentages
            const processedData = this.processLanguageData(languageData);

            // Save to static files
            await this.saveLanguageData(processedData, repos);
            
            console.log('✅ Language data generation complete!');
            console.log(`   Generated files in: ${this.outputDir}`);
            
        } catch (error) {
            console.error('❌ Error generating language data:', error);
            process.exit(1);
        }
    }

    /**
     * Fetch all repositories for the authenticated user
     */
    async fetchRepositories() {
        try {
            // Use the public users API instead of the authenticated user API
            // This works with the default GITHUB_TOKEN permissions
            const response = await this.octokit.request('GET /users/{username}/repos', {
                username: this.username,
                type: 'owner',
                sort: 'updated',
                per_page: 100,
                headers: {
                    'X-GitHub-Api-Version': '2022-11-28'
                }
            });

            console.log(`   API Rate Limit: ${response.headers['x-ratelimit-remaining']}/${response.headers['x-ratelimit-limit']}`);

            // Filter out forked repositories and include only relevant data
            return response.data
                .filter(repo => !repo.fork)
                .map(repo => ({
                    name: repo.name,
                    full_name: repo.full_name,
                    description: repo.description,
                    language: repo.language,
                    updated_at: repo.updated_at,
                    created_at: repo.created_at,
                    size: repo.size,
                    stargazers_count: repo.stargazers_count
                }));
        } catch (error) {
            console.error('❌ API Error Details:', {
                status: error.status,
                message: error.message,
                documentation_url: error.response?.data?.documentation_url
            });
            throw new Error(`Failed to fetch repositories: ${error.message}`);
        }
    }

    /**
     * Fetch language data for all repositories
     */
    async fetchLanguageData(repos) {
        const languageData = {};
        const repoLanguages = {};

        console.log('   Processing repositories:');
        
        for (const repo of repos) {
            try {
                process.stdout.write(`   - ${repo.name}... `);
                
                const response = await this.octokit.request('GET /repos/{owner}/{repo}/languages', {
                    owner: this.username,
                    repo: repo.name,
                    headers: {
                        'X-GitHub-Api-Version': '2022-11-28'
                    }
                });

                repoLanguages[repo.name] = response.data;

                // Aggregate language data
                Object.entries(response.data).forEach(([language, bytes]) => {
                    if (languageData[language]) {
                        languageData[language] += bytes;
                    } else {
                        languageData[language] = bytes;
                    }
                });

                console.log('✓');
                
                // Small delay to be nice to the API
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.log(`❌ Error: ${error.message}`);
            }
        }

        return { aggregated: languageData, byRepo: repoLanguages };
    }

    /**
     * Process and calculate language percentages
     */
    processLanguageData(languageData) {
        const totalBytes = Object.values(languageData.aggregated).reduce((sum, bytes) => sum + bytes, 0);
        
        if (totalBytes === 0) {
            return { languages: [], totalBytes: 0 };
        }

        const languages = Object.entries(languageData.aggregated)
            .map(([language, bytes]) => ({
                name: language,
                bytes: bytes,
                percent: (bytes / totalBytes) * 100
            }))
            .filter(lang => lang.percent >= 1) // Filter languages with less than 1%
            .sort((a, b) => b.percent - a.percent)
            .slice(0, 8); // Top 8 languages

        return {
            languages,
            totalBytes,
            byRepo: languageData.byRepo
        };
    }

    /**
     * Save language data to static JSON files
     */
    async saveLanguageData(processedData, repos) {
        const timestamp = new Date().toISOString();
        
        // Main language data file (used by the website)
        const mainData = {
            lastUpdated: timestamp,
            totalRepositories: repos.length,
            totalBytes: processedData.totalBytes,
            languages: processedData.languages.map(lang => ({
                name: lang.name,
                percent: Math.round(lang.percent * 100) / 100, // Round to 2 decimal places
                bytes: lang.bytes
            }))
        };

        // Detailed data file (for debugging/reference)
        const detailedData = {
            lastUpdated: timestamp,
            repositories: repos,
            languagesByRepo: processedData.byRepo,
            aggregatedLanguages: processedData.languages,
            metadata: {
                totalRepositories: repos.length,
                totalBytes: processedData.totalBytes,
                generatedBy: 'GitHub Language Data Generator',
                version: '1.0.0'
            }
        };

        // Write files
        const mainFile = path.join(this.outputDir, 'github-languages.json');
        const detailedFile = path.join(this.outputDir, 'github-languages-detailed.json');

        fs.writeFileSync(mainFile, JSON.stringify(mainData, null, 2));
        fs.writeFileSync(detailedFile, JSON.stringify(detailedData, null, 2));

        console.log(`   📄 Main data: github-languages.json`);
        console.log(`   📄 Detailed data: github-languages-detailed.json`);
    }
}

// Run the generator
const generator = new LanguageDataGenerator();
generator.generate();
