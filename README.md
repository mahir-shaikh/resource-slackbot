# resource-slackbot
A slack bot for maintaining shared resources.

Created by Prafull Nikose and Mahir Shaikh


## URL Changes in Slack Bot App Configuration
Slash Command - Edit Command - Request URL
http://ec2-54-247-44-110.eu-west-1.compute.amazonaws.com:3000/slack/events

Interactivity & Shortcuts - Request URL
http://ec2-54-247-44-110.eu-west-1.compute.amazonaws.com:3000/slack/events

Event Subscriptions - Request URL
http://ec2-54-247-44-110.eu-west-1.compute.amazonaws.com:3000/slack/events


Before: https://appdemo-usage-bot.herokuapp.com/slack/events

## AWS Server Update - 10th January 2024
URL: http://ec2-18-201-144-75.eu-west-1.compute.amazonaws.com:3000

Slash Command - Edit Command - Request URL
http://ec2-18-201-144-75.eu-west-1.compute.amazonaws.com:3000/slack/events

Interactivity & Shortcuts - Request URL
http://ec2-18-201-144-75.eu-west-1.compute.amazonaws.com:3000/slack/events

Event Subscriptions - Request URL
http://ec2-18-201-144-75.eu-west-1.compute.amazonaws.com:3000/slack/events

## AWS Steps:
1. Create EC2 free, Allow HTTP from all
2. Open remote, install node, copy project, npm install and npm start - check on localhost:9999 to make sure it is running
3. Firewall setting in EC2 - disable private, public and domain
4. Inboud Rule - add 80,9999,3000 - (I don't know if this actually helped)