// MD File Reader für Dynamic Dashboard
// Dieses Script liest echte .md-Dateien und stellt sie für das Dashboard bereit

const fs = require('fs').promises;
const path = require('path');
const http = require('http');
const url = require('url');

// Konfiguration der Dateipfade
const CONFIG = {
    projectRoot: process.cwd(),
    paths: {
        kanban: 'docs/project-management/02-kanban-board.md',
        roadmap: 'docs/project-management/01-project-roadmap.md',
        wbs: 'docs/project-management/06-work-breakdown-structure.md',
        stakeholder: 'docs/project-management/05-stakeholder-map.md',
        userJourney: 'docs/project-management/04-user-journey-map.md',
        architecture: 'docs/project-management/03-architecture-diagram.md',
        mindMap: 'docs/project-management/07-mind-map.md',
        bmadTasks: '.bmad-core/tasks',
        bmadTemplates: '.bmad-core/templates',
        bmadWorkflows: '.bmad-core/workflows',
        epics: 'docs/epics'
    },
    port: 3001
};

// Hilfsfunktion: Datei lesen
async function readFile(filePath) {
    try {
        const fullPath = path.join(CONFIG.projectRoot, filePath);
        const content = await fs.readFile(fullPath, 'utf8');
        const stats = await fs.stat(fullPath);
        
        return {
            success: true,
            content,
            lastModified: stats.mtime,
            size: stats.size,
            path: filePath
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            path: filePath
        };
    }
}

// Hilfsfunktion: Verzeichnis scannen
async function scanDirectory(dirPath) {
    try {
        const fullPath = path.join(CONFIG.projectRoot, dirPath);
        const files = await fs.readdir(fullPath);
        
        const fileList = [];
        for (const file of files) {
            const filePath = path.join(fullPath, file);
            const stats = await fs.stat(filePath);
            
            if (stats.isFile() && file.endsWith('.md')) {
                fileList.push({
                    name: file,
                    path: path.join(dirPath, file),
                    lastModified: stats.mtime,
                    size: stats.size
                });
            }
        }
        
        return {
            success: true,
            files: fileList,
            directory: dirPath
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            directory: dirPath
        };
    }
}

// Markdown-Parser für Tasks
function parseTasksFromMarkdown(content) {
    const tasks = [];
    const lines = content.split('\n');
    let currentSection = '';
    let currentSubsection = '';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Hauptsektion erkennen (## oder ###)
        const sectionMatch = line.match(/^##\s+(.+)/);
        if (sectionMatch) {
            currentSection = sectionMatch[1].toLowerCase();
            continue;
        }
        
        // Untersektion erkennen (#### oder mehr)
        const subsectionMatch = line.match(/^####+\s+(.+)/);
        if (subsectionMatch) {
            currentSubsection = subsectionMatch[1].toLowerCase();
            continue;
        }
        
        // Standard Checkbox Tasks
        const checkboxMatch = line.match(/^\s*-\s*\[([ x])\]\s*(.+?)(?:\s*\((\d+)\s*SP\))?(?:\s*@(\w+))?/);
        if (checkboxMatch) {
            const [, checked, text, points, assignee] = checkboxMatch;
            
            let status = 'todo';
            if (checked === 'x') status = 'done';
            else if (currentSection.includes('progress') || currentSection.includes('🚧')) status = 'progress';
            else if (currentSection.includes('review') || currentSection.includes('🔍')) status = 'review';
            else if (currentSection.includes('done') || currentSection.includes('✅')) status = 'done';
            
            tasks.push({
                text: text.trim(),
                status,
                points: points ? parseInt(points) : 0,
                assignee: assignee || null,
                section: currentSection,
                subsection: currentSubsection
            });
        }
        
        // Bullet Point Tasks (ohne Checkbox)
        const bulletMatch = line.match(/^\s*-\s*\*\*(.+?)\*\*\s*(.*)/);
        if (bulletMatch) {
            const [, title, description] = bulletMatch;
            
            let status = 'todo';
            if (currentSection.includes('progress') || currentSection.includes('🚧')) status = 'progress';
            else if (currentSection.includes('review') || currentSection.includes('🔍')) status = 'review';
            else if (currentSection.includes('done') || currentSection.includes('✅')) status = 'done';
            else if (currentSection.includes('backlog') || currentSection.includes('📋')) status = 'backlog';
            
            tasks.push({
                text: title.trim() + (description ? ' - ' + description.trim() : ''),
                status,
                points: 0,
                assignee: null,
                section: currentSection,
                subsection: currentSubsection
            });
        }
        
        // Story Points aus nachfolgenden Zeilen extrahieren
        const storyPointsMatch = line.match(/\*\*Story Points:\*\*\s*(\d+)/);
        if (storyPointsMatch && tasks.length > 0) {
            tasks[tasks.length - 1].points = parseInt(storyPointsMatch[1]);
        }
        
        // Assignee aus nachfolgenden Zeilen extrahieren
        const assigneeMatch = line.match(/\*\*Assignee:\*\*\s*(.+)/);
        if (assigneeMatch && tasks.length > 0) {
            tasks[tasks.length - 1].assignee = assigneeMatch[1].trim();
        }
        
        // Status aus nachfolgenden Zeilen extrahieren
        const statusMatch = line.match(/\*\*Status:\*\*\s*(.+)/);
        if (statusMatch && tasks.length > 0) {
            const statusText = statusMatch[1].toLowerCase();
            if (statusText.includes('complete') || statusText.includes('done')) {
                tasks[tasks.length - 1].status = 'done';
            } else if (statusText.includes('progress') || statusText.includes('active')) {
                tasks[tasks.length - 1].status = 'progress';
            } else if (statusText.includes('review') || statusText.includes('pending')) {
                tasks[tasks.length - 1].status = 'review';
            }
        }
        
        // Progress aus nachfolgenden Zeilen extrahieren
        const progressMatch = line.match(/\*\*Progress:\*\*\s*(\d+)%/);
        if (progressMatch && tasks.length > 0) {
            tasks[tasks.length - 1].progress = parseInt(progressMatch[1]);
        }
    }
    
    return tasks;
}

// Metriken berechnen
function calculateMetrics(allTasks) {
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t.status === 'done').length;
    const inProgressTasks = allTasks.filter(t => t.status === 'progress').length;
    const totalPoints = allTasks.reduce((sum, t) => sum + t.points, 0);
    const completedPoints = allTasks.filter(t => t.status === 'done').reduce((sum, t) => sum + t.points, 0);
    
    return {
        totalTasks,
        completedTasks,
        inProgressTasks,
        pendingTasks: totalTasks - completedTasks - inProgressTasks,
        totalPoints,
        completedPoints,
        progressPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        pointsPercentage: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0
    };
}

// HTTP Server für API
const server = http.createServer(async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    try {
        if (pathname === '/api/dashboard') {
            // Alle Dashboard-Daten laden
            const results = {};
            const allTasks = [];
            
            // Einzelne Dateien laden
            for (const [key, filePath] of Object.entries(CONFIG.paths)) {
                if (typeof filePath === 'string' && filePath.endsWith('.md')) {
                    const result = await readFile(filePath);
                    results[key] = result;
                    
                    if (result.success) {
                        const tasks = parseTasksFromMarkdown(result.content);
                        allTasks.push(...tasks);
                    }
                }
            }
            
            // Verzeichnisse scannen
            const directories = ['bmadTasks', 'bmadTemplates', 'bmadWorkflows', 'epics'];
            for (const dir of directories) {
                const result = await scanDirectory(CONFIG.paths[dir]);
                results[dir] = result;
                
                if (result.success) {
                    // Erste paar Dateien aus jedem Verzeichnis laden
                    const filesToLoad = result.files.slice(0, 3);
                    for (const file of filesToLoad) {
                        const fileResult = await readFile(file.path);
                        if (fileResult.success) {
                            const tasks = parseTasksFromMarkdown(fileResult.content);
                            allTasks.push(...tasks);
                        }
                    }
                }
            }
            
            // Metriken berechnen
            const metrics = calculateMetrics(allTasks);
            
            res.writeHead(200);
            res.end(JSON.stringify({
                success: true,
                timestamp: new Date().toISOString(),
                data: results,
                metrics,
                taskCount: allTasks.length
            }, null, 2));
            
        } else if (pathname === '/api/file') {
            // Einzelne Datei laden
            const filePath = parsedUrl.query.path;
            if (!filePath) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Dateipfad erforderlich' }));
                return;
            }
            
            const result = await readFile(filePath);
            res.writeHead(200);
            res.end(JSON.stringify(result, null, 2));
            
        } else if (pathname === '/api/directory') {
            // Verzeichnis scannen
            const dirPath = parsedUrl.query.path;
            if (!dirPath) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Verzeichnispfad erforderlich' }));
                return;
            }
            
            const result = await scanDirectory(dirPath);
            res.writeHead(200);
            res.end(JSON.stringify(result, null, 2));
            
        } else if (pathname === '/api/config') {
            // Konfiguration zurückgeben
            res.writeHead(200);
            res.end(JSON.stringify({
                success: true,
                config: CONFIG,
                projectRoot: CONFIG.projectRoot
            }, null, 2));
            
        } else {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Endpoint nicht gefunden' }));
        }
        
    } catch (error) {
        console.error('Server Error:', error);
        res.writeHead(500);
        res.end(JSON.stringify({ error: error.message }));
    }
});

// Server starten
server.listen(CONFIG.port, () => {
    console.log(`\n🚀 MD File Reader Server gestartet!`);
    console.log(`📡 API verfügbar unter: http://localhost:${CONFIG.port}`);
    console.log(`📁 Projekt-Root: ${CONFIG.projectRoot}`);
    console.log(`\n📋 Verfügbare Endpoints:`);
    console.log(`   GET /api/dashboard     - Alle Dashboard-Daten`);
    console.log(`   GET /api/file?path=... - Einzelne Datei laden`);
    console.log(`   GET /api/directory?path=... - Verzeichnis scannen`);
    console.log(`   GET /api/config        - Server-Konfiguration`);
    console.log(`\n💡 Verwendung:`);
    console.log(`   1. Server starten: node md-file-reader.js`);
    console.log(`   2. Dynamic Dashboard öffnen`);
    console.log(`   3. Dashboard lädt automatisch echte .md-Dateien`);
    console.log(`\n⌨️  Strg+C zum Beenden`);
});

// Graceful Shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Server wird beendet...');
    server.close(() => {
        console.log('✅ Server erfolgreich beendet');
        process.exit(0);
    });
});

// Error Handling
process.on('uncaughtException', (error) => {
    console.error('❌ Unbehandelter Fehler:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unbehandelte Promise Rejection:', reason);
    process.exit(1);
});