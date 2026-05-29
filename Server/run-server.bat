@echo off
cd /d "c:\Users\aymen\Desktop\OmniLearn\OmniLearn\Server"
set DATABASE_URL=
node src/server.js > server.out.log 2> server.err.log
