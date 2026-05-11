from typing import TypedDict


class RouteConfig(TypedDict, total=False):
    primary: str
    fallback: str | None
    retries: int
    backoff: list[float]


ROUTING_TABLE: dict[str, RouteConfig] = {
    "default": {
        "primary": "meta-llama/llama-3.3-70b-instruct:free",
        "fallback": "qwen/qwen-2.5-72b-instruct:free",
        "retries": 3,
        "backoff": [35.0, 35.0, 35.0],
    },
    "sentiment": {
        "primary": "meta-llama/llama-3.1-8b-instruct:free",
        "fallback": "meta-llama/llama-3.3-70b-instruct:free",
        "retries": 3,
        "backoff": [35.0, 35.0, 35.0],
    },
    "synthesis": {
        "primary": "qwen/qwen-2.5-72b-instruct:free",
        "fallback": "meta-llama/llama-3.3-70b-instruct:free",
        "retries": 3,
        "backoff": [35.0, 35.0, 35.0],
    },
}


def get_route(key: str) -> RouteConfig:
    return ROUTING_TABLE.get(key, ROUTING_TABLE["default"])
