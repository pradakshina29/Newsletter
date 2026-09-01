@echo off
title KPRCAS Newsletter Studio - Orchestrator Setup
echo =====================================================================
echo           KPRCAS NEWSLETTER STUDIO - BOOTSTRAP SYSTEM
echo =====================================================================
echo.

:: Step 1: Verify Node.js and NPM
echo [1/4] Checking Node.js and NPM environment...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js is present.
call npm -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] NPM is not installed. Please check your Node.js installation.
    pause
    exit /b 1
)
echo [OK] NPM is present.
echo.

:: Step 2: Verify Java Environment
echo [2/4] Checking Java JDK installation...
if exist "C:\Program Files\Java\jdk-9" (
    echo [INFO] Setting JAVA_HOME to C:\Program Files\Java\jdk-9
    set "JAVA_HOME=C:\Program Files\Java\jdk-9"
    set "PATH=C:\Program Files\Java\jdk-9\bin;%PATH%"
)
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Java JDK is not installed or not on PATH. Please install JDK 9+
    pause
    exit /b 1
)
echo [OK] Java JDK is present.
echo.

:: Step 3: Check/Download Maven
echo [3/4] Checking Apache Maven build system...
set "M2_HOME=%CD%\.maven\apache-maven-3.9.6"
set "PATH_ADDITION=%CD%\.maven\apache-maven-3.9.6\bin"

call mvn -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Maven was not found on your system PATH.
    if exist "%PATH_ADDITION%\mvn.cmd" (
        echo [INFO] Found local Maven installation in .maven folder.
        set "PATH=%PATH_ADDITION%;%PATH%"
    ) else (
        echo [INFO] Downloading Apache Maven 3.9.6 automatically...
        echo This may take a moment. Please wait...
        
        powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; New-Item -ItemType Directory -Force -Path '.maven'; Invoke-WebRequest -Uri 'https://archive.apache.org/dist/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.zip' -OutFile '.maven\maven.zip'"
        
        echo [INFO] Extracting Apache Maven...
        powershell -Command "Expand-Archive -Path '.maven\maven.zip' -DestinationPath '.maven' -Force"
        
        echo [INFO] Cleaning up archives...
        del .maven\maven.zip
        
        echo [INFO] Registering Maven path for this session.
        set "PATH=%PATH_ADDITION%;%PATH%"
    )
) else (
    echo [OK] Global Maven is already present.
)
call mvn -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Maven setup failed. Please install Maven manually.
    pause
    exit /b 1
)
echo [OK] Maven is ready.
echo.

:: Step 4: Boot up Frontend & Backend
echo [4/4] Starting KPRCAS Newsletter Studio services...
echo.

:: Launch Spring Boot backend in a separate terminal window
echo [INFO] Starting Backend Server (Spring Boot) on http://localhost:8080 ...
echo [INFO] Logs will be written to local terminal.
start "KPRCAS Backend Service" cmd /k "cd backend && call mvn spring-boot:run"

:: Wait 4 seconds for backend to compile and bind ports
timeout /t 4 >nul

:: Launch Vite React frontend in a separate terminal window
echo [INFO] Installing Frontend node packages and starting Dev Server...
start "KPRCAS Frontend Service" cmd /k "cd frontend && call npm install && call npm run dev"

echo.
echo =====================================================================
echo                    SETUP COMPLETED SUCCESSFULLY!
echo.
echo  * The Backend API is compiling and starting on http://localhost:8080
echo  * The Frontend is installing packages and launching on http://localhost:5173
echo.
echo  * Default Accounts for testing role layouts:
echo    - Admin Role:    admin@kprcas.ac.in    / admin123
echo    - Faculty Role:  faculty@kprcas.ac.in  / faculty123
echo    - Student Role:  student@kprcas.ac.in  / student123
echo.
echo  Press any key to close this installer launcher.
echo =====================================================================
pause >nul
