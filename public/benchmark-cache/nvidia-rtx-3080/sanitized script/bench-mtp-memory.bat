@echo off
setlocal EnableDelayedExpansion

if not defined CONDA_ENV set "CONDA_ENV=llama.cpp.bench"
if not defined SERVER_EXE set "SERVER_EXE=path to your llama-server.exe"
if not defined SPEED_BENCH set "SPEED_BENCH=tools\server\bench\speed-bench\speed_bench.py"
if not defined RESULTS_DIR set "RESULTS_DIR=mtp-memory-bench-results"
set "MODEL=path to your MTP model"
if not defined PORT set "PORT=8080"
if not defined MTP_N_MAX_VALUES set "MTP_N_MAX_VALUES=1 2 3 4 5"
if not defined BENCH_VALUES set "BENCH_VALUES=qualitative throughput_1k throughput_2k"
if not defined THROUGHPUT_CATEGORY_VALUES set "THROUGHPUT_CATEGORY_VALUES=low_entropy mixed high_entropy"
if not defined OSL_VALUES set "OSL_VALUES=1024 2048 4096"
if not defined LIMIT set "LIMIT=1"
if not defined THROUGHPUT_LIMIT set "THROUGHPUT_LIMIT=1"
if not defined LOG_INTERVAL_MS set "LOG_INTERVAL_MS=100"

if not defined SERVER_ARGS set "SERVER_ARGS=-c 8192 -b 2048 -ub 2048 -ngl -1 -fa on --parallel 1 --jinja"

set "RUN_INDEX=%RESULTS_DIR%\runs.csv"
set "URL=localhost:%PORT%"
set "LIMIT_DISPLAY=none"
if defined LIMIT (
  set "LIMIT_DISPLAY=%LIMIT%"
)

if "%MODEL%"=="" (
  echo Set MODEL near the top of %~nx0 before running.
  echo Example:
  echo   set "MODEL=path to your LLM\model.gguf"
  echo.
  echo Optional environment overrides:
  echo   SERVER_EXE=%SERVER_EXE%
  echo   SERVER_ARGS=%SERVER_ARGS%
  echo   PORT=%PORT%
  echo   RESULTS_DIR=%RESULTS_DIR%
  echo   LIMIT=%LIMIT%
  echo   LOG_INTERVAL_MS=%LOG_INTERVAL_MS%
  exit /b 1
)

if not exist "%MODEL%" (
  echo Could not find model "%MODEL%".
  exit /b 1
)

if not exist "%SERVER_EXE%" (
  echo Could not find "%SERVER_EXE%".
  exit /b 1
)

if not exist "%SPEED_BENCH%" (
  echo Could not find "%SPEED_BENCH%".
  exit /b 1
)

where nvidia-smi >nul 2>nul
if errorlevel 1 (
  echo Could not find nvidia-smi in PATH.
  exit /b 1
)

echo Running MTP memory sweep...
echo Model: %MODEL%
echo Server: %SERVER_EXE%
echo Server args: %SERVER_ARGS%
echo MTP n_max values: %MTP_N_MAX_VALUES%
echo Benches: %BENCH_VALUES%
echo Throughput categories: %THROUGHPUT_CATEGORY_VALUES%
echo OSL values: %OSL_VALUES%
echo Qualitative sample limit: %LIMIT_DISPLAY%
echo Throughput sample limit per category: %THROUGHPUT_LIMIT%
echo GPU memory log interval: %LOG_INTERVAL_MS% ms
echo Results directory: %RESULTS_DIR%
echo.

if not exist "%RESULTS_DIR%" mkdir "%RESULTS_DIR%"
echo mtp_n_max,bench,category,osl,concurrency,temperature,json,gpu_csv,server_log > "%RUN_INDEX%"

for %%N in (%MTP_N_MAX_VALUES%) do (
  set "SERVER_TITLE=llama-server-mtp-n%%N-%RANDOM%"
  set "SERVER_LOG=%RESULTS_DIR%\server_mtp_n%%N.log"

  echo Starting llama-server with --spec-draft-n-max %%N...
  start "!SERVER_TITLE!" /min "%COMSPEC%" /c title !SERVER_TITLE! ^& "%SERVER_EXE%" -m "%MODEL%" --port %PORT% %SERVER_ARGS% --spec-type draft-mtp --spec-draft-n-max %%N ^> "!SERVER_LOG!" 2^>^&1

  call :WAIT_FOR_SERVER
  if errorlevel 1 goto FAILED
  call :GET_SERVER_PID "%%N"
  if errorlevel 1 goto FAILED
  echo Sampling GPU memory from llama-server PID !SERVER_PID!.

  for %%B in (%BENCH_VALUES%) do (
    if /i "%%B"=="qualitative" (
      for %%O in (%OSL_VALUES%) do (
        set "CURRENT_BENCH=%%B"
        set "CURRENT_CATEGORY=all"
        set "CURRENT_OSL=%%O"
        set "OUT_JSON=%RESULTS_DIR%\mtp_n%%N_%%B_all_osl%%O_tokens.json"
        echo Running workload bench=%%B category=all osl=%%O n_max=%%N...

        call :RUN_WITH_MEMORY "%%N" "%%B" "all" "%%O" "%LIMIT%" "!OUT_JSON!"
        set "STATUS=!ERRORLEVEL!"
        if not "!STATUS!"=="0" goto FAILED
      )
    ) else (
      for %%C in (%THROUGHPUT_CATEGORY_VALUES%) do (
        for %%O in (%OSL_VALUES%) do (
          set "CURRENT_BENCH=%%B"
          set "CURRENT_CATEGORY=%%C"
          set "CURRENT_OSL=%%O"
          echo Running workload bench=%%B category=%%C osl=%%O n_max=%%N...

          call :RUN_WITH_MEMORY "%%N" "%%B" "%%C" "%%O" "%THROUGHPUT_LIMIT%" ""
          set "STATUS=!ERRORLEVEL!"
          if not "!STATUS!"=="0" goto FAILED
        )
      )
    )
  )

  call :STOP_SERVER
  if errorlevel 1 exit /b %ERRORLEVEL%
  echo Finished n_max %%N.
  echo.
)

echo All memory runs complete.
echo Run index written to "%RUN_INDEX%".
echo Qualitative token counts are in the qualitative JSON outputs.
echo Per-run GPU CSV files and server logs written to "%RESULTS_DIR%".
exit /b 0

:WAIT_FOR_SERVER
for /l %%I in (1,1,60) do (
  curl.exe -fsS "http://%URL%/health" >nul 2>nul
  if not errorlevel 1 exit /b 0
  timeout /t 1 /nobreak >nul
)
echo llama-server did not become healthy. See "!SERVER_LOG!".
exit /b 1

:GET_SERVER_PID
set "MTP_N=%~1"
set "SERVER_PID="
for /f "skip=1 tokens=2 delims=," %%P in ('wmic process where "name='llama-server.exe' and commandline like '%%--port %PORT%%%' and commandline like '%%--spec-draft-n-max %MTP_N%%%'" get ProcessId /format:csv 2^>nul') do (
  if not "%%~P"=="" set "SERVER_PID=%%~P"
)
if not defined SERVER_PID (
  for /f "tokens=2 delims=," %%P in ('tasklist /fi "imagename eq llama-server.exe" /fo csv /nh 2^>nul') do (
    set "SERVER_PID=%%~P"
  )
)
if not defined SERVER_PID (
  echo Could not find llama-server PID.
  exit /b 1
)
exit /b 0

:STOP_SERVER
call :STOP_LOGGER
if defined SERVER_TITLE (
  taskkill /fi "WINDOWTITLE eq !SERVER_TITLE!*" /t /f >nul 2>nul
)
timeout /t 2 /nobreak >nul
exit /b 0

:RUN_WITH_MEMORY
set "MTP_N=%~1"
set "BENCH=%~2"
set "CATEGORY=%~3"
set "OSL=%~4"
set "RUN_LIMIT=%~5"
set "OUT_JSON=%~6"
set "RUN_NAME=mtp_n%MTP_N%_%BENCH%_%CATEGORY%_osl%OSL%"
set "GPU_CSV=%RESULTS_DIR%\%RUN_NAME%.csv"
set "LOGGER_TITLE=llama-server-gpu-memory-logger-%RUN_NAME%-%RANDOM%"

echo %MTP_N%,%BENCH%,%CATEGORY%,%OSL%,1,0,"%OUT_JSON%","%GPU_CSV%","!SERVER_LOG!" >> "%RUN_INDEX%"
echo timestamp,index,name,memory_used_mib,memory_free_mib,memory_total_mib,memory_utilization_percent,gpu_utilization_percent > "%GPU_CSV%"
start "!LOGGER_TITLE!" /min "%COMSPEC%" /c title !LOGGER_TITLE! ^& nvidia-smi --query-gpu=timestamp,index,name,memory.used,memory.free,memory.total,utilization.memory,utilization.gpu --format=csv,noheader,nounits -lms %LOG_INTERVAL_MS% ^>^> "%GPU_CSV%"

call :RUN_SPEED_BENCH "%BENCH%" "%CATEGORY%" "%OSL%" "%RUN_LIMIT%" "%OUT_JSON%"
set "STATUS=%ERRORLEVEL%"
call :STOP_LOGGER
exit /b %STATUS%

:STOP_LOGGER
if defined LOGGER_TITLE taskkill /fi "WINDOWTITLE eq !LOGGER_TITLE!*" /t /f >nul 2>nul
exit /b 0

:RUN_SPEED_BENCH
setlocal
set "BENCH=%~1"
set "CATEGORY=%~2"
set "OSL=%~3"
set "RUN_LIMIT=%~4"
set "OUT_JSON=%~5"
set "RUN_LIMIT_ARG="
set "OUTPUT_ARG="
if defined RUN_LIMIT set "RUN_LIMIT_ARG=--limit %RUN_LIMIT%"
if defined OUT_JSON set "OUTPUT_ARG=--output ""%OUT_JSON%"""

call conda activate "%CONDA_ENV%"
if errorlevel 1 (
  echo Failed to activate conda environment "%CONDA_ENV%".
  endlocal & exit /b 1
)

python "%SPEED_BENCH%" ^
  --url "%URL%" ^
  --bench "%BENCH%" ^
  --category "%CATEGORY%" ^
  --osl %OSL% ^
  --concurrency 1 ^
  %RUN_LIMIT_ARG% ^
  --extra-inputs "{""temperature"":0}" ^
  %OUTPUT_ARG%

set "STATUS=%ERRORLEVEL%"
endlocal & exit /b %STATUS%

:FAILED
set "STATUS=%ERRORLEVEL%"
call :STOP_SERVER
echo Benchmark failed with exit code !STATUS!.
echo Last GPU memory CSV: "!GPU_CSV!"
echo Server log: "!SERVER_LOG!"
exit /b !STATUS!
