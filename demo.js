/**
 * Demo Script - Traffic Signal Simulator
 * 
 * This script demonstrates how to use the traffic signal simulator system.
 * It simulates a complete scenario with server, cameras, and subscribers.
 */

const TrafficSignalServer = require('./server');
const CameraSimulator = require('./CameraSimulator');
const SignalSubscriber = require('./SignalSubscriber');

async function runDemo() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║         Traffic Signal Control System - Demo                  ║
║                                                                ║
║  This demo shows how the traffic signal system works with:     ║
║  - A TCP socket server managing traffic signals               ║
║  - Multiple camera clients sending traffic data               ║
║  - Multiple subscriber clients receiving signal updates       ║
╚════════════════════════════════════════════════════════════════╝
  `);

  // Start server
  console.log('\n📡 Starting Traffic Signal Server...\n');
  const server = new TrafficSignalServer(4000, 'localhost', false);

  try {
    await server.start();

    console.log('\n✅ Server started successfully!\n');

    // Wait a bit for server to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Start camera simulator
    console.log('📹 Starting Camera Simulator...\n');
    const camera = new CameraSimulator('localhost', 4000, false);
    
    try {
      await camera.connect();
      console.log('\n✅ Camera connected!\n');
      
      // Start simulation
      camera.startSimulation(3000, 'wave');
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Start subscriber
      console.log('\n👁️  Starting Signal Subscriber...\n');
      const subscriber = new SignalSubscriber('localhost', 4000, false);
      
      try {
        await subscriber.connect();
        console.log('\n✅ Subscriber connected!\n');
        
        // Subscribe to all routes
        await subscriber.subscribeToRoutes('all');
        
        console.log('\n🚦 Real-time Signal Updates (press Ctrl+C to stop):\n');
        console.log('-'.repeat(100) + '\n');
        
        // Let it run for a bit
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        // Display traffic status
        console.log('\n\n' + '='.repeat(100));
        await subscriber.displayTrafficStatus();
        
        // Display full status
        console.log('\n' + '='.repeat(100));
        await subscriber.displayFullStatus();
        
      } catch (error) {
        console.error('Subscriber error:', error.message);
      } finally {
        if (camera.isConnected) {
          camera.stopSimulation();
          await camera.disconnect();
        }
        if (subscriber.isConnected) {
          await subscriber.disconnect();
        }
      }
      
    } catch (error) {
      console.error('Camera error:', error.message);
    }

  } catch (error) {
    console.error('Server error:', error.message);
  } finally {
    await server.stop();
    process.exit(0);
  }
}

// Run demo
runDemo().catch(error => {
  console.error('Demo failed:', error.message);
  process.exit(1);
});

// Handle signals
process.on('SIGINT', () => {
  console.log('\n\nDemo stopped by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\nDemo terminated');
  process.exit(0);
});
