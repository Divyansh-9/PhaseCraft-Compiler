const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = 3001;

// Path to the C compiler executable
const COMPILER_PATH = path.join(__dirname, '..', 'compiler_c', 'compiler.exe');

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', compiler: COMPILER_PATH });
});

// Main compile endpoint
app.post('/api/compile', (req, res) => {
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid "code" field in request body' });
    }

    console.log(`[Compile] Received ${code.length} chars of source code`);

    // Spawn the C compiler with --json --stdin flags
    const compiler = spawn(COMPILER_PATH, ['--json', '--stdin'], {
        cwd: path.dirname(COMPILER_PATH),
        timeout: 10000 // 10 second timeout
    });

    let stdout = '';
    let stderr = '';

    compiler.stdout.on('data', (data) => {
        stdout += data.toString();
    });

    compiler.stderr.on('data', (data) => {
        stderr += data.toString();
    });

    compiler.on('error', (err) => {
        console.error(`[Compile] Failed to start compiler: ${err.message}`);
        res.status(500).json({ error: `Failed to start compiler: ${err.message}` });
    });

    compiler.on('close', (exitCode) => {
        console.log(`[Compile] Compiler exited with code ${exitCode}`);

        if (exitCode !== 0) {
            // Compiler had an error (syntax error, etc.)
            const errorMsg = stderr.trim() || stdout.trim() || `Compiler exited with code ${exitCode}`;
            return res.status(200).json({ error: errorMsg });
        }

        try {
            const result = JSON.parse(stdout);
            console.log(`[Compile] Success - ${result.tokens ? result.tokens.length : 0} tokens`);
            res.json(result);
        } catch (parseErr) {
            console.error(`[Compile] Failed to parse compiler output: ${parseErr.message}`);
            console.error(`[Compile] Raw output: ${stdout.substring(0, 500)}`);
            res.status(500).json({ 
                error: 'Failed to parse compiler output',
                raw: stdout.substring(0, 1000)
            });
        }
    });

    // Send the source code to compiler's stdin
    compiler.stdin.write(code);
    compiler.stdin.end();
});

app.listen(PORT, () => {
    console.log(`\n🚀 Compiler API Server running on http://localhost:${PORT}`);
    console.log(`📦 Using compiler: ${COMPILER_PATH}`);
    console.log(`\nEndpoints:`);
    console.log(`  GET  /api/health  - Health check`);
    console.log(`  POST /api/compile - Compile source code\n`);
});
