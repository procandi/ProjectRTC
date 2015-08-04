require 'rubygems'
require 'socket.io-client-simple'

socket = SocketIO::Client::Simple.connect 'http://localhost:3000'

## connect with parameter
socket = SocketIO::Client::Simple.connect 'http://localhost:3000', :foo => "bar"

socket.on :connect do
  puts "connect!!!"
end

socket.on :disconnect do
  puts "disconnected!!"
end

socket.on :chat do |data|
  puts "> " + data['msg']
end

socket.on :error do |err|
  p err
end

puts "please input and press Enter key"
loop do
  msg = STDIN.gets.strip
  next if msg.empty?
  socket.emit :chat, {:msg => msg, :at => Time.now}
end