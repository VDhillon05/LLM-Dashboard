@echo off
setlocal

set "BENCH=path to your llama-bench.exe"

set "RESULTS=output-token-bench-results.json"
set "MODELS=path to your LLMs"

set "PROMPT_TOKENS=512"
set "OUTPUT_TOKENS=3277,6554,9830,13107"

if not exist "%BENCH%" (
  echo Could not find "%BENCH%".
  exit /b 1
)

echo Running output-token benchmarks...
echo Fixed prompt tokens: %PROMPT_TOKENS%
echo Output token sweep: %OUTPUT_TOKENS%
echo.

call :RUN_BENCH "%MODELS%" "%RESULTS%"
if errorlevel 1 exit /b %ERRORLEVEL%

echo All benchmarks complete.
exit /b 0

:RUN_BENCH
set "MODELS=%~1"
set "RESULTS=%~2"

echo Models: %MODELS%
echo Results file: %RESULTS%
echo.

"%BENCH%" ^
  -m "%MODELS%" ^
  -ngl -1 ^
  -sm none ^
  -mg 0 ^
  -r 100 ^
  -p %PROMPT_TOKENS% ^
  -n %OUTPUT_TOKENS% ^
  -o json ^
  --progress > "%RESULTS%"

set "STATUS=%ERRORLEVEL%"
if not "%STATUS%"=="0" (
  echo Benchmark failed with exit code %STATUS%.
  exit /b %STATUS%
)

echo Benchmark complete. Results written to "%RESULTS%".
echo.
exit /b 0
