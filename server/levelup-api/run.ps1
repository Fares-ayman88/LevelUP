$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here
$localPython = "C:\Users\Start\AppData\Local\Programs\Python\Python311\python.exe"
if (Test-Path $localPython) {
  & $localPython server.py
} else {
  py server.py
}
