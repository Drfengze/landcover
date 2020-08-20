#! /usr/bin/env python
# -*- coding: utf-8 -*-
# vim:fenc=utf-8
# pylint: disable=E1137,E1136,E0110
import sys
import os
import time
import datetime
import collections
import argparse

import numpy as np

import logging
LOGGER = logging.getLogger("server")

import rpyc
from rpyc.utils.server import OneShotServer, ThreadedServer


from web_tool.ModelSessionKerasExample import KerasDenseFineTune
from web_tool.ModelSessionPyTorchExample import TorchFineTuning
from web_tool.ModelSessionPyTorchCycle import TorchSmoothingCycleFineTune
from web_tool.ModelSessionPyTorchXY import TorchSmoothingXYFineTune
from web_tool.Utils import setup_logging, serialize, deserialize


class MyService(rpyc.Service):

    def __init__(self, model):
        self.model = model
        
    def on_connect(self, conn):
        pass

    def on_disconnect(self, conn):
        pass

    def exposed_last_tile(self):
        return serialize(self.model.last_tile)

    def exposed_run(self, tile, inference_mode=False):
        tile = deserialize(tile) # need to serialize/deserialize numpy arrays
        output = self.model.run(tile, inference_mode)
        return serialize(output) # need to serialize/deserialize numpy arrays

    def exposed_retrain(self):
        return self.model.retrain()

    def exposed_add_sample_point(self, row, col, class_idx):
        return self.model.add_sample_point(row, col, class_idx)

    def exposed_undo(self):
        return self.model.undo()

    def exposed_reset(self):
        return self.model.reset()

    def exposed_save_state_to(self, directory):
        return self.model.save_state_to(directory)

    def exposed_load_state_from(self, directory):
        return self.model.load_state_from(directory)

def main():
    global MODEL
    parser = argparse.ArgumentParser(description="AI for Earth Land Cover Worker")

    parser.add_argument("-v", "--verbose", action="store_true", help="Enable verbose debugging", default=False)

    parser.add_argument("--port", action="store", type=int, help="Port we are listenning on", default=0)
    parser.add_argument("--model", action="store", dest="model",
        choices=[
            "keras_example",
            "pytorch_example",
            "pytorch_smoothing_multiple",
            "pytorch_smoothing_xy"
        ],
        help="Model to use", required=True
    )
    parser.add_argument("--model_fn", action="store", dest="model_fn", type=str, help="Model fn to use", default=None)
    parser.add_argument("--fine_tune_layer", action="store", dest="fine_tune_layer", type=int, help="Layer of model to fine tune", default=-2)

    parser.add_argument("--num_models", action="store", dest="num_models", type=int, help="Number of models", default=3)
    
    parser.add_argument("--gpu", action="store", dest="gpuid", type=int, help="GPU to use", required=False)

    args = parser.parse_args(sys.argv[1:])

    # Setup logging
    log_path = os.path.join(os.getcwd(), "tmp/logs/")
    setup_logging(log_path, "worker")


    # Setup model
    os.environ["CUDA_DEVICE_ORDER"] = "PCI_BUS_ID"
    os.environ["CUDA_VISIBLE_DEVICES"] = "" if args.gpuid is None else str(args.gpuid)
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3' 


    if args.model == "keras_example":
        model = KerasDenseFineTune(args.model_fn, args.gpuid, args.fine_tune_layer)
    elif args.model == "pytorch_example":
        model = TorchFineTuning(args.model_fn, args.gpuid, args.fine_tune_layer)
    elif args.model == "pytorch_smoothing_multiple":
        model = TorchSmoothingCycleFineTune(args.model_fn, args.gpuid, args.fine_tune_layer, args.num_models)
    elif args.model == "pytorch_smoothing_xy":
        model = TorchSmoothingXYFineTune(args.model_fn, args.gpuid, args.fine_tune_layer)
    else:
        raise NotImplementedError("The given model type is not implemented yet.")

    t = OneShotServer(MyService(model), port=args.port)
    t.start()
   
if __name__ == "__main__":
    main()
