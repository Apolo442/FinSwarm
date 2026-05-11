import pytest
from unittest.mock import patch, MagicMock
from src.data.fundamentus import FundamentusData, fetch_fundamentus


MOCK_HTML = """
<html><body>
<table>
<tr><td class="label"><span>P/L</span></td><td class="data"><span>8,5</span></td></tr>
<tr><td class="label"><span>P/VP</span></td><td class="data"><span>1,2</span></td></tr>
<tr><td class="label"><span>ROE</span></td><td class="data"><span>18,3%</span></td></tr>
<tr><td class="label"><span>Dív. Bruta/PL</span></td><td class="data"><span>0,8</span></td></tr>
<tr><td class="label"><span>Marg. EBIT</span></td><td class="data"><span>22,1%</span></td></tr>
</table>
</body></html>
"""


@patch("src.data.fundamentus.requests.get")
def test_fetch_fundamentus_parses_pl(mock_get):
    mock_resp = MagicMock()
    mock_resp.text = MOCK_HTML
    mock_resp.status_code = 200
    mock_get.return_value = mock_resp

    result = fetch_fundamentus("PETR4")
    assert isinstance(result, FundamentusData)
    assert result.pl == pytest.approx(8.5, 0.01)


@patch("src.data.fundamentus.requests.get")
def test_fetch_fundamentus_parses_roe(mock_get):
    mock_resp = MagicMock()
    mock_resp.text = MOCK_HTML
    mock_resp.status_code = 200
    mock_get.return_value = mock_resp

    result = fetch_fundamentus("PETR4")
    assert result.roe == pytest.approx(0.183, 0.01)
