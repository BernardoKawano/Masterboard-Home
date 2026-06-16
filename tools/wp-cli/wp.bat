@echo off
set "PHP=C:\Users\Owner\AppData\Local\Programs\Local\resources\extraResources\lightning-services\php-8.2.29+0\bin\win64\php.exe"
set "WPCLI=%~dp0wp-cli.phar"
"%PHP%" "%WPCLI%" %*
