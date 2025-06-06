#!/usr/bin/env python3
"""
Tiz Lead Scraper - Enhanced Development Runner
Automatically handles dependencies, virtual environments, and import paths
"""

import os
import sys
import time
import signal
import subprocess
from pathlib import Path
import importlib.util

def ensure_virtual_environment():
    """Check if we're in a virtual environment, create and activate one if not"""
    print("🔍 Checking virtual environment...")
    
    # Check if already in virtual environment
    in_venv = (hasattr(sys, 'real_prefix') or 
               (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix))
    
    if in_venv:
        print("✅ Running in virtual environment")
        return True
    
    print("⚠️  Not in virtual environment. Setting up automatically...")
    
    # Create virtual environment
    venv_path = Path("venv")
    if not venv_path.exists():
        try:
            print("📦 Creating virtual environment...")
            subprocess.run([sys.executable, "-m", "venv", "venv"], check=True)
            print("✅ Virtual environment created at ./venv")
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to create virtual environment: {e}")
            print("💡 Try installing python3-venv: sudo apt-get install python3-venv")
            return False
    
    # Determine the python executable path based on OS
    if os.name == 'nt':  # Windows
        python_exe = venv_path / "Scripts" / "python.exe"
        pip_exe = venv_path / "Scripts" / "pip.exe"
    else:  # Unix/Linux/MacOS
        python_exe = venv_path / "bin" / "python"
        pip_exe = venv_path / "bin" / "pip"
    
    # Verify the virtual environment python exists
    if not python_exe.exists():
        print(f"❌ Virtual environment python not found at: {python_exe}")
        return False
    
    print("🔄 Activating virtual environment and restarting...")
    print("📦 This will install dependencies automatically...")
    
    # Restart the script using the virtual environment python
    try:
        # Get the current script path
        current_script = Path(__file__).absolute()
        
        # Pass a special flag to indicate we're running in venv
        env = os.environ.copy()
        env['TIZ_VENV_ACTIVE'] = '1'
        
        # Run the script in the virtual environment
        result = subprocess.run([
            str(python_exe), str(current_script)
        ], env=env)
        
        # Exit with the same code as the subprocess
        sys.exit(result.returncode)
        
    except KeyboardInterrupt:
        print("\n🛑 Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Failed to restart in virtual environment: {e}")
        print("\n💡 Manual activation:")
        if os.name == 'nt':
            print("   .\\venv\\Scripts\\activate")
            print("   python run_dev.py")
        else:
            print("   source venv/bin/activate")
            print("   python run_dev.py")
        return False

def install_package(package_name, import_name=None):
    """Install a package using pip"""
    import_name = import_name or package_name
    
    try:
        # Try to import first
        __import__(import_name)
        return True
    except ImportError:
        print(f"📦 Installing {package_name}...")
        try:
            subprocess.run([
                sys.executable, "-m", "pip", "install", package_name
            ], check=True, capture_output=True, text=True)
            print(f"✅ {package_name} installed successfully")
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to install {package_name}: {e}")
            return False

def install_all_requirements():
    """Install all requirements from requirements.txt with individual fallback"""
    print("📦 Installing requirements...")
    
    # First try to install all at once
    try:
        result = subprocess.run([
            sys.executable, "-m", "pip", "install", "-r", "requirements.txt"
        ], check=True, capture_output=True, text=True)
        print("✅ All requirements installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"⚠️  Batch install failed, trying individual packages...")
        print(f"Error: {e.stderr}")
    
    # If batch install fails, try individual packages
    requirements_file = Path("requirements.txt")
    if not requirements_file.exists():
        print("❌ requirements.txt not found")
        return False
    
    success_count = 0
    total_count = 0
    
    with open(requirements_file, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                total_count += 1
                # Extract package name (before == or >=)
                package_name = line.split('==')[0].split('>=')[0].split('[')[0]
                
                if install_package(line.strip()):
                    success_count += 1
                else:
                    print(f"⚠️  Failed to install {package_name}, continuing...")
    
    print(f"📊 Installation summary: {success_count}/{total_count} packages installed")
    return success_count > 0

def check_and_install_dependencies():
    """Check if required packages are available, install if missing"""
    print("🔍 Checking dependencies...")
    
    # Core dependencies mapping (import_name: package_name)
    core_dependencies = {
        'fastapi': 'fastapi==0.104.1',
        'uvicorn': 'uvicorn[standard]==0.24.0',
        'pydantic': 'pydantic==2.5.0',
        'pydantic_settings': 'pydantic-settings==2.1.0',
        'structlog': 'structlog==23.2.0',
        'tenacity': 'tenacity==8.2.3',
        'httpx': 'httpx==0.25.2',
        'psutil': 'psutil==5.9.6'
    }
    
    missing_deps = []
    
    # Check each core dependency
    for import_name, package_name in core_dependencies.items():
        try:
            __import__(import_name)
            print(f"✅ {import_name}")
        except ImportError:
            print(f"❌ {import_name} missing")
            missing_deps.append(package_name)
    
    # If any dependencies are missing, try to install all requirements
    if missing_deps:
        print(f"📦 {len(missing_deps)} dependencies missing, installing...")
        return install_all_requirements()
    else:
        print("✅ All core dependencies available")
        return True

def setup_python_path():
    """Setup Python path to handle app imports correctly"""
    print("🔧 Setting up Python path...")
    
    # Get current directory (project root)
    project_root = Path.cwd()
    app_dir = project_root / "app"
    
    # Add project root to Python path (for 'app' module imports)
    project_root_str = str(project_root)
    if project_root_str not in sys.path:
        sys.path.insert(0, project_root_str)
        print(f"✅ Added project root to Python path: {project_root_str}")
    
    # Verify app directory exists
    if not app_dir.exists():
        print(f"❌ App directory not found at: {app_dir}")
        return False
    
    # Verify main.py exists
    main_file = app_dir / "main.py"
    if not main_file.exists():
        print(f"❌ main.py not found at: {main_file}")
        return False
    
    print("✅ Python path configured for app imports")
    return True

def kill_processes_on_port(port=5000):
    """Kill any processes running on the specified port"""
    print(f"🔍 Checking for existing processes on port {port}...")
    
    # Try to import psutil, install if missing
    try:
        import psutil
    except ImportError:
        print("📦 Installing psutil for process management...")
        if not install_package("psutil==5.9.6", "psutil"):
            print("⚠️  Could not install psutil, using fallback method...")
            return kill_port_fallback(port)
        import psutil
    
    killed_any = False
    try:
        for proc in psutil.process_iter(['pid', 'name']):
            try:
                connections = proc.net_connections() if hasattr(proc, 'net_connections') else []
                for conn in connections:
                    if hasattr(conn, 'laddr') and conn.laddr and conn.laddr.port == port:
                        print(f"🛑 Found process {proc.info['pid']} ({proc.info['name']}) using port {port}. Terminating...")
                        proc.terminate()
                        killed_any = True
                        
                        # Wait for graceful shutdown
                        try:
                            proc.wait(timeout=3)
                        except psutil.TimeoutExpired:
                            print(f"⚡ Force killing process {proc.info['pid']}...")
                            proc.kill()
                        break
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess, AttributeError):
                continue
    except Exception as e:
        print(f"⚠️  psutil method failed: {e}")
        return kill_port_fallback(port)
    
    if killed_any:
        print("✅ Port 5000 cleared successfully")
        time.sleep(1)
    else:
        print("✅ Port 5000 is available")
    
    return True

def kill_port_fallback(port=5000):
    """Fallback method to kill processes on port using system commands"""
    print("🔄 Using fallback method to clear port...")
    
    try:
        if os.name == 'nt':  # Windows
            result = subprocess.run(['netstat', '-ano'], capture_output=True, text=True)
            if result.returncode == 0:
                lines = result.stdout.split('\n')
                for line in lines:
                    if f':{port}' in line and 'LISTENING' in line:
                        parts = line.split()
                        if len(parts) >= 5:
                            try:
                                pid = int(parts[-1])
                                print(f"🛑 Found process {pid} using port {port}. Terminating...")
                                subprocess.run(['taskkill', '/F', '/PID', str(pid)], 
                                             capture_output=True, check=False)
                            except (ValueError, subprocess.SubprocessError):
                                continue
        else:  # Unix/Linux/MacOS
            result = subprocess.run(['lsof', '-ti', f':{port}'], capture_output=True, text=True)
            if result.returncode == 0 and result.stdout.strip():
                pids = result.stdout.strip().split('\n')
                for pid in pids:
                    if pid:
                        print(f"🛑 Killing process {pid} on port {port}")
                        subprocess.run(['kill', '-9', pid], capture_output=True)
        
        print("✅ Port clearing attempted")
        time.sleep(1)
        return True
        
    except Exception as e:
        print(f"⚠️  Fallback method failed: {e}")
        print("💡 You may need to manually stop processes on port 5000")
        return True

def setup_environment():
    """Setup environment variables"""
    print("🔧 Setting up environment...")
    
    # Set default environment variables if not already set
    defaults = {
        'PYTHONPATH': str(Path.cwd()),
        'SECRET_KEY': 'tiz-lead-scraper-dev-secret-key-2024',
        'DEBUG': 'true',
        'LOG_LEVEL': 'debug',
        'RATE_LIMIT_REQUESTS': '100',
        'RATE_LIMIT_WINDOW': '60'
    }
    
    for key, value in defaults.items():
        if key not in os.environ:
            os.environ[key] = value
    
    print("✅ Environment configured")

def create_directories():
    """Create necessary directories"""
    print("📁 Creating directories...")
    
    directories = ['logs', 'data', 'attached_assets']
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
    
    print("✅ Directories created")

def test_imports():
    """Test critical imports to ensure everything works"""
    print("🧪 Testing imports...")
    
    try:
        # Test app imports
        from app.core.config import settings
        print("✅ app.core.config imported")
        
        from app.utils.logging_config import setup_logging
        print("✅ app.utils.logging_config imported")
        
        from app.main import app
        print("✅ app.main imported")
        
        import uvicorn
        print("✅ uvicorn imported")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import test failed: {e}")
        print("💡 This usually means missing dependencies or path issues")
        return False

def run_application():
    """Run the FastAPI application"""
    print("🚀 Starting Tiz Lead Scraper in development mode...")
    
    try:
        # Import uvicorn
        import uvicorn
        
        print("✅ Application loaded successfully")
        print("🌐 Starting server on http://localhost:5000")
        print("")
        print("📋 Development Tips:")
        print("• Press Ctrl+C to stop the server")
        print("• Auto-reload is enabled - changes will restart the server")
        print("• API docs available at: http://localhost:5000/docs")
        print("• Health check: http://localhost:5000/health")
        print("• Static files: http://localhost:5000/static/")
        print("")
        
        # Run with auto-reload for development
        uvicorn.run(
            "app.main:app",  # Use module path
            host="0.0.0.0",
            port=5000,
            reload=True,
            access_log=True,
            log_level="debug"
        )
        
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
        return True
    except Exception as e:
        print(f"❌ Failed to start application: {e}")
        print(f"💡 Current directory: {os.getcwd()}")
        print(f"💡 Python path: {sys.path[:3]}...")
        return False

def main():
    """Main function with comprehensive setup"""
    print("🚀 Tiz Lead Scraper - Enhanced Development Runner")
    print("=" * 60)
    
    # Check if we're running in a special restart mode
    venv_active = os.environ.get('TIZ_VENV_ACTIVE', '0') == '1'
    
    try:
        # Step 1: Check virtual environment (unless already activated)
        if not venv_active:
            if not ensure_virtual_environment():
                print("\n💡 Virtual environment setup failed")
                return 1
        else:
            print("✅ Running in activated virtual environment")
        
        # Step 2: Setup Python path for imports
        if not setup_python_path():
            print("❌ Failed to setup Python path")
            return 1
        
        # Step 3: Check and install dependencies
        if not check_and_install_dependencies():
            print("❌ Failed to install dependencies")
            return 1
        
        # Step 4: Kill processes on port 5000
        kill_processes_on_port(5000)
        
        # Step 5: Setup environment
        setup_environment()
        
        # Step 6: Create directories
        create_directories()
        
        # Step 7: Test imports
        if not test_imports():
            print("❌ Import tests failed")
            return 1
        
        # Step 8: Run application
        if run_application():
            print("✅ Application stopped successfully")
            return 0
        else:
            return 1
            
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main()) 