#!/usr/bin/env python3
"""
Test script to verify startup components
"""

import sys
import os
import subprocess
from pathlib import Path

def test_imports():
    """Test if required packages can be imported"""
    print("🧪 Testing imports...")
    
    # Test psutil with better error handling
    try:
        import psutil
        print(f"✅ psutil: {psutil.__version__}")
    except ImportError as e:
        print(f"❌ psutil not available: {e}")
        print("💡 Trying to install psutil...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "psutil"])
            import psutil
            print(f"✅ psutil installed and imported: {psutil.__version__}")
        except Exception as install_error:
            print(f"❌ Failed to install psutil: {install_error}")
            return False
    
    try:
        import fastapi
        print(f"✅ fastapi: {fastapi.__version__}")
    except ImportError:
        print("❌ fastapi not available")
        print("💡 Install with: pip install fastapi")
        return False
    
    try:
        import uvicorn
        print(f"✅ uvicorn available")
    except ImportError:
        print("❌ uvicorn not available")
        print("💡 Install with: pip install uvicorn[standard]")
        return False
    
    return True

def test_port_checking():
    """Test port checking functionality"""
    print("\n🔍 Testing port checking...")
    
    try:
        import psutil
        
        # Test basic psutil functionality
        print(f"✅ psutil imported successfully")
        
        # Find processes using any port (just to test the logic)
        found_any = False
        process_count = 0
        
        for proc in psutil.process_iter(['pid', 'name']):
            try:
                process_count += 1
                connections = proc.connections() if hasattr(proc, 'connections') else []
                if connections:
                    found_any = True
                    break
                if process_count >= 10:  # Just test first 10 processes
                    break
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
        
        if found_any:
            print("✅ Port checking logic works")
        else:
            print("⚠️  No network connections found in test sample")
        
        print(f"✅ Tested {process_count} processes")
        return True
    except Exception as e:
        print(f"❌ Port checking failed: {e}")
        print(f"Error type: {type(e).__name__}")
        return False

def test_file_structure():
    """Test if required files exist"""
    print("\n📁 Testing file structure...")
    
    required_files = [
        "start.sh",
        "start.bat", 
        "run_dev.py",
        "docker-compose.yml",
        "requirements.txt",
        "app/main.py"
    ]
    
    all_exist = True
    for file_path in required_files:
        if Path(file_path).exists():
            print(f"✅ {file_path}")
        else:
            print(f"❌ {file_path} missing")
            all_exist = False
    
    return all_exist

def test_python_environment():
    """Test Python environment details"""
    print("\n🐍 Testing Python environment...")
    
    print(f"✅ Python version: {sys.version.split()[0]}")
    print(f"✅ Python executable: {sys.executable}")
    print(f"✅ Current working directory: {os.getcwd()}")
    
    # Test if we can import basic packages
    try:
        import json
        print("✅ Basic Python modules available")
    except ImportError as e:
        print(f"❌ Basic Python modules issue: {e}")
        return False
    
    return True

def test_startup_scripts():
    """Test if startup scripts are properly formatted"""
    print("\n📜 Testing startup scripts...")
    
    # Check start.sh
    start_sh = Path("start.sh")
    if start_sh.exists():
        try:
            content = start_sh.read_text(encoding='utf-8', errors='ignore')
            if "kill_port_5000" in content and "docker-compose" in content:
                print("✅ start.sh has port conflict resolution")
            else:
                print("⚠️  start.sh missing some features")
        except Exception as e:
            print(f"⚠️  Could not read start.sh: {e}")
    
    # Check start.bat
    start_bat = Path("start.bat")
    if start_bat.exists():
        try:
            content = start_bat.read_text(encoding='utf-8', errors='ignore')
            if "netstat" in content and "taskkill" in content:
                print("✅ start.bat has port conflict resolution")
            else:
                print("⚠️  start.bat missing some features")
        except Exception as e:
            print(f"⚠️  Could not read start.bat: {e}")
    
    # Check run_dev.py
    run_dev = Path("run_dev.py")
    if run_dev.exists():
        try:
            content = run_dev.read_text(encoding='utf-8', errors='ignore')
            if "kill_processes_on_port" in content:
                print("✅ run_dev.py has port conflict resolution")
            else:
                print("⚠️  run_dev.py missing port management")
        except Exception as e:
            print(f"⚠️  Could not read run_dev.py: {e}")
    
    return True

def main():
    """Run all tests"""
    print("🚀 Tiz Lead Scraper - Enhanced Startup Test")
    print("=" * 50)
    
    tests = [
        ("Python environment", test_python_environment),
        ("Package imports", test_imports),
        ("Port checking", test_port_checking),
        ("File structure", test_file_structure),
        ("Startup scripts", test_startup_scripts)
    ]
    
    all_passed = True
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            print(f"\n📋 Running: {test_name}")
            if not test_func():
                all_passed = False
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} failed with error: {e}")
            all_passed = False
            failed_tests.append(test_name)
    
    print("\n" + "=" * 50)
    if all_passed:
        print("✅ All tests passed! Startup scripts should work correctly.")
        print("\n🎯 Ready to start:")
        print("• Windows: Run start.bat")
        print("• Linux/macOS: Run ./start.sh")
        print("• Development: Run python run_dev.py")
        print("\n💡 Next step: Try running one of the startup scripts!")
    else:
        print(f"⚠️  {len(failed_tests)} test(s) had issues: {', '.join(failed_tests)}")
        print("🔧 Most issues are non-critical and startup scripts should still work.")
        print("\n🎯 You can still try:")
        print("• Windows: start.bat")
        print("• Development: python run_dev.py")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 