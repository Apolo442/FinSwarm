from typing import TypedDict


class RouteConfig(TypedDict, total=False):
    primary: str
    fallback: str | None
    retries: int
    backoff: list[float]


ROUTING_TABLE: dict[str, RouteConfig] = {
    "default": {
        "primary": "google/gemini-2.5-flash:free",
        "fallback": "meta-llama/llama-3.3-70b-instruct:free",
        "retries": 3,
        "backoff": [1.0, 2.0, 4.0],
    },
    "sentiment": {
        "primary": "mistral/mistral-large-2407:free",
        "fallback": "google/gemini-2.5-flash:free",
        "retries": 3,
        "backoff": [1.0, 2.0, 4.0],
    },
    "synthesis": {
        "primary": "qwen/qwen-2.5-72b-instruct:free",
        "fallback": "google/gemini-2.5-flash:free",
        "retries": 3,
        "backoff": [1.0, 2.0, 4.0],
    },
}


def get_route(key: str) -> RouteConfig:
    return ROUTING_TABLE.get(key, ROUTING_TABLE["default"])
