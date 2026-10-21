# Routing regression sources

`sovereign-rating-grok.requ` is the original Grok source pasted by the user, unchanged. It has 21 steps and 25 edges, including its missing owners, unused lanes and the end step that continues into surveillance. Do not clean up its lint issues: they exercise linting independently from routing recovery.

`examples/sovereign-rating.requ` includes the user-confirmed `vote -> research : "more analysis"` back-edge (26 edges). The older `examples/bond-rating.requ` filename is retained for the first renderer regression.
