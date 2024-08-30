# Lasius Visualizer Machine Setup Guide

Before proceeding with the setup of the Lasius Visualizer, you need to set up your machine. The steps below will guide you through the installation process.

## Machine Setup

1. **Update Package Lists:**

   First, update your package list to ensure you’re getting the latest versions available in the repository.

   ```bash
   sudo apt-get update
   ```

2. **Fix Missing Packages:**

   Try installing the missing package using the `--fix-missing` option.

   ```bash
   sudo apt-get install -f
   sudo apt-get install --fix-missing
   ```

Now that your machine is set up, you can proceed with the Lasius Visualizer setup.

# Lasius Visualizer Setup Guide

This guide will walk you through setting up the Lasius Visualizer project on an Ubuntu server. The setup includes installing Node.js, Express, PM2, Nginx, configuring SSL with Certbot, and setting up DNS.

## Prerequisites

- An Ubuntu server with sudo privileges.
- A domain name (`visualizer.lasius.fr`) pointed to your server's IP address.

## Step 1: Clone the Repository

First, clone the Lasius Visualizer repository from GitHub:

```bash
git clone https://github.com/galagain/lasius-visualizer.git
```

Navigate into the project directory:

```bash
cd lasius-visualizer
```

## Step 2: Install Node.js and npm

Install Node.js and npm on your server:

```bash
sudo apt install nodejs npm -y
```

Verify the installation:

```bash
node -v
npm -v
```

## Step 3: Install Express

Install Express in the project directory:

```bash
npm install express --save
```

## Step 4: Install PM2 and Start the Application

PM2 is a process manager for Node.js applications that will keep your application running.

Install PM2 globally:

```bash
sudo npm install -g pm2
```

Start your application with PM2:

```bash
pm2 start server.js --name "lasius-visualizer"
```

Configure PM2 to start on boot:

```bash
pm2 startup
pm2 save
```

## Step 5: Install and Configure Nginx

Install Nginx:

```bash
sudo apt install nginx
```

Create a new Nginx configuration file for your site:

```bash
sudo nano /etc/nginx/sites-available/visualizer.lasius.fr
```

Add the following configuration to the file:

```nginx
server {
    listen 80;
    server_name visualizer.lasius.fr;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Save and close the file.

Enable the Nginx configuration by creating a symbolic link:

```bash
sudo ln -s /etc/nginx/sites-available/visualizer.lasius.fr /etc/nginx/sites-enabled/
```

## Step 6: Configure DNS

Make sure your domain (`visualizer.lasius.fr`) is pointing to your server's IP address. You may need to configure this in your domain registrar's DNS settings. Below are examples of DNS records:

| Type | Name       | Content       | TTL   |
| ---- | ---------- | ------------- | ----- |
| A    | visualizer | 195.35.24.123 | 14400 |

## Step 7: Install and Configure SSL with Certbot

Install Certbot and the Nginx plugin:

```bash
sudo apt install certbot python3-certbot-nginx
```

Obtain an SSL certificate for your domain:

```bash
sudo certbot --nginx -d visualizer.lasius.fr
```

Certbot will automatically configure Nginx to use the SSL certificate.

## Step 8: Test and Restart Nginx

Test your Nginx configuration for any errors:

```bash
sudo nginx -t
```

If the test is successful, restart Nginx to apply the changes:

```bash
sudo systemctl restart nginx
```

## Your Lasius Visualizer is Now Set Up!

You should now be able to access your application at [https://visualizer.lasius.fr](https://visualizer.lasius.fr). The application will be running continuously, and the site is secured with HTTPS.
