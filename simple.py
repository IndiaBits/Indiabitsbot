# -*- coding: utf-8 -*-
#!/usr/bin/env python

"""
Minimal Example
===============

Generating a square wordcloud from the US constitution using default arguments.
"""

import os
import schedule
import time
import telegram
from os import path
import wordcloud as wc

def generateImage(filename):
    d = path.dirname(__file__) if "__file__" in locals() else os.getcwd()
    text = open(path.join(d, filename+'.txt')).read()

    wordcloud = wc.WordCloud(width=1200,height=600,background_color="black")
    wordcloud.generate(text)
    image = wordcloud.to_image()
    image.save(filename+'.png', format='png', optimize=True);
    os.remove(filename+'.txt')


def go():
# get data directory (using getcwd() is needed to support running example in generated IPython notebook)

    generateImage("messages")
    generateImage("offmessages")
    generateImage("abnuxmessages")

    bot = telegram.Bot(token='610774076:AAEPK2jx5_IbMTQubOTHGdEW1TGHlcB9JY4')
    bot.send_photo(chat_id=-1001042664406, photo=open('messages.png', 'rb'),caption="📷  Today in a picture!")
    bot.send_photo(chat_id=-1001296675443, photo=open('offmessages.png', 'rb'),caption="📷  Today in a picture!")
    bot.send_photo(chat_id=-1001277350003, photo=open('abnuxmessages.png', 'rb'),caption="📷  Today in a picture!")



# The pil way (if you don't have matplotlib)
# image = wordcloud.to_image()
# image.show()

schedule.every().day.at("23:59").do(go)

while True:
    schedule.run_pending()
    time.sleep(10)
