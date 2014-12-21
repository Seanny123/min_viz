"""Sean's hacky vizualizer proof of concept. This file just loads the front-end

Usage: python main.py [port=8080]
"""

import tornado.ioloop
import tornado.web
import tornado.websocket
import tornado.autoreload
from tornado import gen

import logging
import json
import os.path
import sys
import traceback
import webbrowser
import re
import keyword
import time
import ipdb

import sys

# when a user reaches our url, give the index.html
class  MainHandler(tornado.web.RequestHandler):
    """Request handler for the main landing page."""
    @tornado.web.asynchronous
    def get(self):
        self.render('index.html')

class Application(tornado.web.Application):
    # Main application class for holding global server state.

    def __init__(self, *args, **kwargs):
        # Set up globally accessible data-structures / etc in here!
        # They can be accessed in the request via self.application.

        # Set up logging
        level = logging.DEBUG if kwargs['debug'] else logging.WARNING
        logging.root.setLevel(level)

        super(Application, self).__init__(*args, **kwargs)

# WTF. Why is this stuff outside of `if __name__ == '__main__':`
settings = {
    'static_path': os.path.join(os.path.dirname(__file__), 'static'),
    'template_path': os.path.join(os.path.dirname(__file__), 'templates'),
    'debug': False,
}

# I want to rename graph.json to something that better describes 
# what it's sending to the front end
application = Application([
    (r'/', MainHandler)
], **settings)

if __name__ == '__main__':
    port = int((sys.argv + [8085])[1])
    application.listen(port)
    # open a new tab on start
    webbrowser.open_new_tab('http://localhost:%d/' % port)
    # For debugging purposes reload Tornado whenever one of the static (Javascript, CSS, HTML) are loaded
    tornado.autoreload.start()
    for dir, _, files in os.walk('static'):
        [tornado.autoreload.watch(dir + '/' + f) for f in files if not f.startswith('.')]
    for dir, _, files in os.walk('templates'):
        [tornado.autoreload.watch(dir + '/' + f) for f in files if not f.startswith('.')]
    # Start this puppy up!
    tornado.ioloop.IOLoop.instance().start()