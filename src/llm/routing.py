from typing import TypedDict


class RouteConfig(TypedDict, total=False):
    primary: str
    fallback: str | None
    retries: int
    backoff: list[float]


ROUTING_TABLE: dict[str, RouteConfig] = {
    "default": {
        "primary": "openai/gpt-oss-120b:free",
        "fallback": "z-ai/glm-4.5-air:free",
        "retries": 3,
        "backoff": [10.0, 25.0, 50.0],
    },
    "sentiment": {
        "primary": "z-ai/glm-4.5-air:free",
        "fallback": "openai/gpt-oss-120b:free",
        "retries": 3,
        "backoff": [10.0, 25.0, 50.0],
    },
    "synthesis": {
        "primary": "nvidia/nemotron-3-super-120b-a12b:free",
        "fallback": "openai/gpt-oss-120b:free",
        "retries": 3,
        "backoff": [10.0, 25.0, 50.0],
    },
}


def get_route(key: str) -> RouteConfig:
    return ROUTING_TABLE.get(key, ROUTING_TABLE["default"])
