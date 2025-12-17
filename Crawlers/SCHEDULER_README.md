# Crawler Scheduler

Automated scheduler for running web crawlers with different modes at specified intervals.

## Features

- ✅ Runs multiple crawlers with different modes
- ✅ Configurable intervals per crawler-mode combination
- ✅ 5-minute delay between crawler executions
- ✅ 4-minute timeout with automatic termination (SIGINT)
- ✅ Success/failure tracking with statistics
- ✅ Graceful shutdown handling
- ✅ Automatic restart on failure

## Current Configuration

### Crawlers
- **aboutyou** (`aboutyou.ro.js`)
- **asos** (`asos.com.js`)
- **revolve** (`revolve.com.js`)

### Modes
- `user` - User account creation
- `address` - Address management
- `card` - Payment card management
- `order` - Order placement

### Current Schedule
All crawlers run with `order` mode every **1 hour** with a **5-minute delay** between each.

## Usage

### Run Manually
```bash
cd /home/stonks/Workdir/Stonks/Crawlers
node scheduler.js
```

### Run as System Service

1. **Create logs directory:**
```bash
mkdir -p /home/stonks/Workdir/Stonks/Crawlers/logs
```

2. **Install service:**
```bash
sudo cp crawler-scheduler.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable crawler-scheduler
```

3. **Start service:**
```bash
sudo systemctl start crawler-scheduler
```

4. **Check status:**
```bash
sudo systemctl status crawler-scheduler
```

5. **View logs:**
```bash
# Real-time logs
sudo journalctl -u crawler-scheduler -f

# Or check log files
tail -f /home/stonks/Workdir/Stonks/Crawlers/logs/scheduler.log
tail -f /home/stonks/Workdir/Stonks/Crawlers/logs/scheduler-error.log
```

6. **Stop service:**
```bash
sudo systemctl stop crawler-scheduler
```

## Configuration

Edit `scheduler.js` to modify:

### Add New Crawler
```javascript
{
    name: 'newsite',
    script: 'newsite.com.js',
    modes: {
        order: { interval: 60 * 60 * 1000 },  // 1 hour
        user: { interval: 60 * 60 * 1000 },
        address: { interval: 8 * 60 * 60 * 1000 }, // 8 hours
        card: { interval: 8 * 60 * 60 * 1000 }
    },
    activeModes: ['order'] // Which modes to run
}
```

### Change Intervals
```javascript
modes: {
    order: { interval: 2 * 60 * 60 * 1000 },  // 2 hours
    user: { interval: 60 * 60 * 1000 },       // 1 hour
    address: { interval: 24 * 60 * 60 * 1000 }, // 24 hours
    card: { interval: 12 * 60 * 60 * 1000 }   // 12 hours
}
```

### Activate More Modes
```javascript
activeModes: ['order', 'user', 'address'] // Run multiple modes
```

### Change Delays/Timeouts
```javascript
this.delayBetweenCrawlers = 10 * 60 * 1000; // 10 minutes
this.crawlerTimeout = 5 * 60 * 1000; // 5 minutes
```

## How It Works

1. **Initialization**: Sets up all crawler-mode combinations with their intervals
2. **Main Loop**: 
   - Checks which crawler-mode is due to run (based on last run time + interval)
   - Runs the oldest due crawler first (priority queue)
   - Waits 5 minutes before running the next
3. **Execution**:
   - Spawns crawler process with mode argument
   - Monitors for timeout (4 minutes)
   - Sends SIGINT (Ctrl+C) if timeout exceeded
   - Force kills (SIGKILL) if process doesn't stop after 5 seconds
4. **Tracking**:
   - Exit code 0 = Success
   - Any other exit code = Failure
   - Records statistics and last run time

## Exit Codes

- `0` - Success
- `99` - Invalid mode (from crawler)
- Other - Failure/Error

## Statistics

The scheduler tracks:
- Total runs
- Successful runs
- Failed runs
- Timeouts
- Success rate (%)

## Graceful Shutdown

Press `Ctrl+C` or send SIGTERM to gracefully stop:
1. Stops accepting new crawlers
2. Sends SIGINT to all running crawlers
3. Waits 5 seconds
4. Force kills any remaining processes
5. Prints final statistics
