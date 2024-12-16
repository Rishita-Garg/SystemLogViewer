const express = require('express');
const { exec } = require('child_process');
const session = require('express-session');
const app = express();
const fs = require('fs');

// Serve static files (CSS, JS) if you want to add styling or additional functionality
app.use(express.static('public'));

// Middleware for parsing form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session middleware for storing user session
app.use(session({
    secret: 'secret-key', // Change to a strong secret
    resave: false,
    saveUninitialized: true
}));

// Read credentials from a separate JSON file
const credentials = JSON.parse(fs.readFileSync('data.json', 'utf8'));

// Serve login page
app.get('/login', (req, res) => {
  if (req.session.loggedIn) {
      return res.redirect('/');
  }
  res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Login</title>
          <style>
              body {
                  font-family: 'Arial', sans-serif;
                  background: linear-gradient(to right, #2c3e50, #34495e);
                  color: #fff;
                  margin: 0;
                  padding: 0;
                  height: 100vh;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  text-align: center;
              }
              .login-container {
                  background-color: rgba(0, 0, 0, 0.6);
                  padding: 40px;
                  border-radius: 10px;
                  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                  width: 350px;
              }
              h1 {
                  font-size: 36px;
                  margin-bottom: 10px;
                  font-weight: bold;
              }
              h3 {
                  font-size: 18px;
                  margin-bottom: 30px;
                  font-weight: lighter;
              }
              .login-container input {
                  width: 100%;
                  padding: 12px;
                  margin: 10px 0;
                  border: 1px solid #ccc;
                  border-radius: 5px;
                  font-size: 16px;
              }
              .login-container button {
                  width: 100%;
                  padding: 12px;
                  background-color: #007bff;
                  color: white;
                  border: none;
                  border-radius: 5px;
                  font-size: 18px;
                  cursor: pointer;
              }
              .login-container button:hover {
                  background-color: #0056b3;
              }
              footer {
                  position: fixed;
                  bottom: 20px;
                  width: 100%;
                  text-align: center;
                  font-size: 14px;
                  color: rgba(255, 255, 255, 0.7);
              }
              #camera-container {
                  margin-top: 20px;
                  display: flex;
                  justify-content: center;
              }
              #video {
                  border-radius: 10px;
                  background-color: black;
              }
          </style>
      </head>
      <body>
          <div class="login-container">
              <h1>Welcome to the System Log Viewer</h1>
              <h3>Brought to you by IS Lab Project '24</h3>
              <form method="POST" action="/login" enctype="multipart/form-data" id="login-form">
                  <input type="text" name="username" placeholder="Username" required />
                  <input type="password" name="password" placeholder="Password" required />
                  <div id="camera-container">
                      <video id="video" width="320" height="240" autoplay></video>
                      <canvas id="canvas" style="display: none;"></canvas>
                  </div>
                  <button type="button" id="capture-btn">Capture Photo</button>
                  <input type="file" name="photo" id="photo" style="display: none;" />
                  <button type="submit">Login</button>
              </form>
          </div>
          <footer>
              <p>Project by Aarav, Rishita, and Shresth</p>
          </footer>
          <script>
              // Access camera and capture photo
              const video = document.getElementById('video');
              const canvas = document.getElementById('canvas');
              const captureBtn = document.getElementById('capture-btn');
              const photoInput = document.getElementById('photo');
              
              // Start the video stream
              navigator.mediaDevices.getUserMedia({ video: true })
                  .then(stream => {
                      video.srcObject = stream;
                  })
                  .catch(err => {
                      alert('Error accessing camera: ' + err);
                  });
              
              captureBtn.addEventListener('click', () => {
                  canvas.width = video.videoWidth;
                  canvas.height = video.videoHeight;
                  const ctx = canvas.getContext('2d');
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  canvas.toBlob(blob => {
                      const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
                      const dataTransfer = new DataTransfer();
                      dataTransfer.items.add(file);
                      photoInput.files = dataTransfer.files;
                  }, 'image/jpeg');
              });
          </script>
      </body>
      </html>
  `);
});
const multer = require('multer');

// Set up multer storage to store images locally
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'uploads/');  // Save uploaded images to 'uploads' directory
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Modify the login POST to handle the photo upload
app.post('/login', upload.single('photo'), (req, res) => {
    const { username, password } = req.body;

    // Here, you can check if the photo is uploaded, and even save the path in the session
    const photoPath = req.file ? req.file.path : null; // Path to the photo

    if (username === credentials.username && password === credentials.password) {
        req.session.loggedIn = true;
        req.session.photoPath = photoPath;  // Store photo path in session
        return res.redirect('/');
    } else {
        return res.send('Invalid credentials. Please try again.');
    }
});

// Handle login request
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (username === credentials.username && password === credentials.password) {
        req.session.loggedIn = true;
        return res.redirect('/');
    } else {
        return res.send('Invalid credentials. Please try again.');
    }
});

// Serve system log page only if the user is logged in
app.get('/', (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login');
    }

    res.send(`
      <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>System Log Viewer</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f4f9;
            color: #333;
        }
        header {
            background-color: #007bff;
            color: white;
            text-align: center;
            padding: 10px 0;
        }
        .log-container {
            margin: 20px;
            padding: 20px;
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            max-width: 90%;
            margin-left: auto;
            margin-right: auto;
        }
        pre {
            white-space: pre-wrap;
            word-wrap: break-word;
            background-color: #282c34;
            color: #f1f1f1;
            padding: 10px;
            border-radius: 5px;
            font-family: Consolas, monospace;
            overflow-y: auto;
        }
        button {
            padding: 10px 20px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        }
        button:hover {
            background-color: #0056b3;
        }
    </style>
</head>
<body>
    <header>
        <h1>System Log Viewer</h1>
    </header>
    
    <!-- System Logs Section -->
    <div class="log-container">
        <h3>Last 100 System Logs</h3>
        <button id="loadLogs">Load Logs</button>
        <div id="logs"></div>
    </div>
    
    <!-- Password Change Attempts Section -->
    <div class="log-container">
        <h3>Check Password Change Attempts</h3>
        <button id="checkPasswordChanges">Check Password Changes</button>
        <div id="passwordChanges"></div>
    </div>

    <!-- System Integrity Check Section -->
    <div class="log-container">
        <h3>System Integrity Check</h3>
        <button id="checkIntegrity">Check Integrity</button>
        <div id="integrityStatus"></div>
    </div>

    <!-- Failed Login Attempts Monitor Section -->
    <div class="log-container">
        <h3>Failed Login Attempts</h3>
        <button id="checkFailedLogins">Check Failed Logins</button>
        <div id="failedLogins"></div>
    </div>

    <!-- Suspicious IP Address Detection Section -->
    <div class="log-container">
        <h3>Suspicious IP Addresses</h3>
        <button id="checkSuspiciousIPs">Check Suspicious IPs</button>
        <div id="suspiciousIPs"></div>
    </div>

    <!-- Data Encryption Status Check Section -->
    <div class="log-container">
        <h3>Data Encryption Status</h3>
        <button id="checkEncryption">Check Encryption Status</button>
        <div id="encryptionStatus"></div>
    </div>

    <!-- System Audit Report Section -->
    <div class="log-container">
        <h3>Generate System Audit Report</h3>
        <button id="generateAuditReport">Generate Report</button>
        <div id="auditReport"></div>
    </div>

    <script>
        // Fetch and display system logs
        document.getElementById('loadLogs').addEventListener('click', function() {
            fetch('/logs')
                .then(response => response.text())
                .then(data => {
                    document.getElementById('logs').innerHTML = '<pre>' + data + '</pre>';
                })
                .catch(error => {
                    document.getElementById('logs').innerHTML = 'Error loading logs: ' + error;
                });
        });

        // Fetch and display password change attempts
        document.getElementById('checkPasswordChanges').addEventListener('click', function() {
            fetch('/check-password-changes')
                .then(response => response.text())
                .then(data => {
                    document.getElementById('passwordChanges').innerHTML = '<pre>' + data + '</pre>';
                })
                .catch(error => {
                    document.getElementById('passwordChanges').innerHTML = 'Error checking password changes: ' + error;
                });
        });

        // Fetch and display system integrity check
        document.getElementById('checkIntegrity').addEventListener('click', function() {
            fetch('/check-integrity')
                .then(response => response.text())
                .then(data => {
                    document.getElementById('integrityStatus').innerHTML = '<pre>' + data + '</pre>';
                })
                .catch(error => {
                    document.getElementById('integrityStatus').innerHTML = 'Error checking integrity: ' + error;
                });
        });

        // Fetch and display failed login attempts
        document.getElementById('checkFailedLogins').addEventListener('click', function() {
            fetch('/failed-logins')
                .then(response => response.text())
                .then(data => {
                    document.getElementById('failedLogins').innerHTML = '<pre>' + data + '</pre>';
                })
                .catch(error => {
                    document.getElementById('failedLogins').innerHTML = 'Error checking failed logins: ' + error;
                });
        });

        // Fetch and display suspicious IP addresses
        document.getElementById('checkSuspiciousIPs').addEventListener('click', function() {
            fetch('/suspicious-ips')
                .then(response => response.text())
                .then(data => {
                    document.getElementById('suspiciousIPs').innerHTML = '<pre>' + data + '</pre>';
                })
                .catch(error => {
                    document.getElementById('suspiciousIPs').innerHTML = 'Error checking suspicious IPs: ' + error;
                });
        });

        // Fetch and display encryption status
        document.getElementById('checkEncryption').addEventListener('click', function() {
            fetch('/check-encryption')
                .then(response => response.text())
                .then(data => {
                    document.getElementById('encryptionStatus').innerHTML = '<pre>' + data + '</pre>';
                })
                .catch(error => {
                    document.getElementById('encryptionStatus').innerHTML = 'Error checking encryption status: ' + error;
                });
        });

        // Fetch and display system audit report
        document.getElementById('generateAuditReport').addEventListener('click', function() {
            fetch('/generate-audit-report')
                .then(response => response.text())
                .then(data => {
                    document.getElementById('auditReport').innerHTML = '<pre>' + data + '</pre>';
                })
                .catch(error => {
                    document.getElementById('auditReport').innerHTML = 'Error generating audit report: ' + error;
                });
        });
    </script>
</body>
</html>

    `);
});

// Endpoint to get system logs
app.get('/logs', (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login');
    }

    const command = 'powershell "Get-EventLog -LogName System -Newest 100 | Format-List"';
    exec(command, (err, stdout, stderr) => {
        if (err) {
            console.error("Error fetching system logs:", err);
            res.status(500).send("Could not fetch system log.");
        } else if (stderr) {
            console.error("PowerShell error:", stderr);
            res.status(500).send("Error in fetching logs.");
        } else {
            res.send(`<pre>${stdout}</pre>`);  // Sending logs in preformatted text for readability
        }
    });
});

// Endpoint to check for password change attempts
app.get('/check-password-changes', (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login');
    }

    const command = 'powershell "Get-EventLog -LogName Security -Newest 100 | Where-Object { $_.EventID -eq 4723 -or $_.EventID -eq 4724 -or $_.EventID -eq 6281 } | Format-List"';
    exec(command, (err, stdout, stderr) => {
        if (err) {
            console.error("Error checking password changes:", err);
            res.status(500).send("Could not check password change events.");
        } else if (stderr) {
            console.error("PowerShell error:", stderr);
            res.status(500).send("Error in checking password change events.");
        } else {
            if (stdout.trim() === '') {
                res.send('No password change events found in the log.');
            } else {
                res.send(`<pre>${stdout}</pre>`);
            }
        }
    });
});

// Endpoint to check system integrity by comparing hash values
app.get('/check-integrity', (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login');
    }

    const command = 'powershell "Get-FileHash -Path C:\\Windows\\System32\\config\\*.exe | Format-List"';
    exec(command, (err, stdout, stderr) => {
        if (err) {
            console.error("Error in system integrity check:", err);
            res.status(500).send("System integrity check failed.");
        } else if (stderr) {
            console.error("PowerShell error:", stderr);
            res.status(500).send("Error in checking system integrity.");
        } else {
            res.send(`<pre>${stdout}</pre>`);
        }
    });
});
// Endpoint to monitor failed login attempts
app.get('/failed-logins', (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login');
    }

    const command = 'powershell "Get-EventLog -LogName Security -Newest 100 | Where-Object { $_.EventID -eq 4625 } | Format-List"';
    exec(command, (err, stdout, stderr) => {
        if (err) {
            console.error("Error fetching failed login attempts:", err);
            res.status(500).send("Failed to retrieve login attempts.");
        } else if (stderr) {
            console.error("PowerShell error:", stderr);
            res.status(500).send("Error in fetching login attempts.");
        } else {
            res.send(`<pre>${stdout}</pre>`);
        }
    });
});
// Endpoint to detect suspicious IP addresses
app.get('/suspicious-ips', (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login');
    }

    const command = 'powershell "Get-EventLog -LogName Security -Newest 100 | Where-Object { $_.EventID -eq 4624 } | Select-Object -Property @{Name=\'IPAddress\';Expression={ $_.ReplacementStrings[18] }} | Format-List"';
    exec(command, (err, stdout, stderr) => {
        if (err) {
            console.error("Error checking suspicious IPs:", err);
            res.status(500).send("Could not check suspicious IPs.");
        } else if (stderr) {
            console.error("PowerShell error:", stderr);
            res.status(500).send("Error in checking suspicious IPs.");
        } else {
            res.send(`<pre>${stdout}</pre>`);
        }
    });
});
// Endpoint to check encryption status of sensitive directories
app.get('/check-encryption', (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login');
    }

    const command = 'powershell "Get-BitLockerVolume -MountPoint C: | Format-List VolumeStatus"';
    exec(command, (err, stdout, stderr) => {
        if (err) {
            console.error("Error checking encryption status:", err);
            res.status(500).send("Could not check encryption status.");
        } else if (stderr) {
            console.error("PowerShell error:", stderr);
            res.status(500).send("Error in checking encryption status.");
        } else {
            res.send(`<pre>${stdout}</pre>`);
        }
    });
});
// Endpoint to generate a system audit report
app.get('/generate-audit-report', (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login');
    }

    const command = 'powershell "Get-EventLog -LogName Security -Newest 100 | Format-List"';
    exec(command, (err, stdout, stderr) => {
        if (err) {
            console.error("Error generating audit report:", err);
            res.status(500).send("Could not generate audit report.");
        } else if (stderr) {
            console.error("PowerShell error:", stderr);
            res.status(500).send("Error in generating audit report.");
        } else {
            // Simulating report generation in text format for simplicity
            res.send(`<pre>System Audit Report:\n\n${stdout}</pre>`);
        }
    });
});

// Start the server
app.listen(3001, () => {
    console.log('Server is running on http://localhost:3000');
});
