// Copyright (c) 2026 Probo Inc <hello@getprobo.com>.
//
// Permission to use, copy, modify, and/or distribute this software for any
// purpose with or without fee is hereby granted, provided that the above
// copyright notice and this permission notice appear in all copies.
//
// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
// REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
// AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
// INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
// LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
// OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
// PERFORMANCE OF THIS SOFTWARE.

package console_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.probo.inc/probo/e2e/internal/factory"
	"go.probo.inc/probo/e2e/internal/testutil"
)

func TestRiskAssessment_Create(t *testing.T) {
	t.Parallel()

	t.Run("with required fields", func(t *testing.T) {
		t.Parallel()
		owner := testutil.NewClient(t, testutil.RoleOwner)

		var result struct {
			CreateRiskAssessment struct {
				RiskAssessmentEdge struct {
					Node struct {
						ID   string `json:"id"`
						Name string `json:"name"`
					} `json:"node"`
				} `json:"riskAssessmentEdge"`
			} `json:"createRiskAssessment"`
		}
		err := owner.Execute(`
			mutation($input: CreateRiskAssessmentInput!) {
				createRiskAssessment(input: $input) {
					riskAssessmentEdge { node { id name } }
				}
			}
		`, map[string]any{
			"input": map[string]any{
				"organizationId": owner.GetOrganizationID().String(),
				"name":           "Platform Threat Model",
			},
		}, &result)

		require.NoError(t, err)
		assert.NotEmpty(t, result.CreateRiskAssessment.RiskAssessmentEdge.Node.ID)
		assert.Equal(t, "Platform Threat Model", result.CreateRiskAssessment.RiskAssessmentEdge.Node.Name)
	})
}

func TestRiskAssessment_Delete(t *testing.T) {
	t.Parallel()

	t.Run("cascades to scopes", func(t *testing.T) {
		t.Parallel()
		owner := testutil.NewClient(t, testutil.RoleOwner)

		raID := factory.CreateRiskAssessment(owner)
		scopeID := factory.CreateRiskAssessmentScope(owner, raID)

		_, err := owner.Do(`
			mutation($input: DeleteRiskAssessmentInput!) {
				deleteRiskAssessment(input: $input) { deletedRiskAssessmentId }
			}
		`, map[string]any{"input": map[string]any{"riskAssessmentId": raID}})
		require.NoError(t, err)

		var result struct {
			Node *struct {
				ID string `json:"id"`
			} `json:"node"`
		}
		err = owner.Execute(`query($id: ID!) { node(id: $id) { ... on RiskAssessmentScope { id } } }`,
			map[string]any{"id": scopeID}, &result)
		testutil.AssertNodeNotAccessible(t, err, result.Node == nil, "RiskAssessmentScope")
	})
}

func TestRiskAssessmentScope_CRUD(t *testing.T) {
	t.Parallel()

	t.Run("create and list via assessment", func(t *testing.T) {
		t.Parallel()
		owner := testutil.NewClient(t, testutil.RoleOwner)

		raID := factory.CreateRiskAssessment(owner)
		factory.CreateRiskAssessmentScope(owner, raID, factory.Attrs{"name": "API scope"})
		factory.CreateRiskAssessmentScope(owner, raID, factory.Attrs{"name": "Infra scope"})

		var result struct {
			Node struct {
				Scopes struct {
					TotalCount int `json:"totalCount"`
					Edges      []struct {
						Node struct {
							ID   string `json:"id"`
							Name string `json:"name"`
						} `json:"node"`
					} `json:"edges"`
				} `json:"scopes"`
			} `json:"node"`
		}
		err := owner.Execute(`
			query($id: ID!) {
				node(id: $id) {
					... on RiskAssessment {
						scopes(first: 10) {
							totalCount
							edges { node { id name } }
						}
					}
				}
			}
		`, map[string]any{"id": raID}, &result)

		require.NoError(t, err)
		assert.Equal(t, 2, result.Node.Scopes.TotalCount)
		assert.Len(t, result.Node.Scopes.Edges, 2)
	})
}

func TestRiskAssessmentNode_Create(t *testing.T) {
	t.Parallel()

	for _, nodeType := range []string{"ENTITY", "BOUNDARY", "ASSET"} {
		t.Run("nodeType="+nodeType, func(t *testing.T) {
			t.Parallel()
			owner := testutil.NewClient(t, testutil.RoleOwner)
			raID := factory.CreateRiskAssessment(owner)
			scopeID := factory.CreateRiskAssessmentScope(owner, raID)

			var result struct {
				CreateRiskAssessmentNode struct {
					RiskAssessmentNodeEdge struct {
						Node struct {
							ID       string `json:"id"`
							NodeType string `json:"nodeType"`
						} `json:"node"`
					} `json:"riskAssessmentNodeEdge"`
				} `json:"createRiskAssessmentNode"`
			}
			err := owner.Execute(`
				mutation($input: CreateRiskAssessmentNodeInput!) {
					createRiskAssessmentNode(input: $input) {
						riskAssessmentNodeEdge { node { id nodeType } }
					}
				}
			`, map[string]any{
				"input": map[string]any{
					"riskAssessmentScopeId": scopeID,
					"nodeType":              nodeType,
					"name":                  "Node-" + nodeType,
				},
			}, &result)

			require.NoError(t, err)
			assert.Equal(t, nodeType, result.CreateRiskAssessmentNode.RiskAssessmentNodeEdge.Node.NodeType)
		})
	}
}

func TestRiskAssessmentProcess_Create(t *testing.T) {
	t.Parallel()

	owner := testutil.NewClient(t, testutil.RoleOwner)
	raID := factory.CreateRiskAssessment(owner)
	scopeID := factory.CreateRiskAssessmentScope(owner, raID)
	src := factory.CreateRiskAssessmentNode(owner, scopeID, factory.Attrs{"nodeType": "ENTITY"})
	dst := factory.CreateRiskAssessmentNode(owner, scopeID, factory.Attrs{"nodeType": "ASSET"})

	var result struct {
		CreateRiskAssessmentProcess struct {
			RiskAssessmentProcessEdge struct {
				Node struct {
					ID           string `json:"id"`
					SourceNodeID string `json:"sourceNodeId"`
					TargetNodeID string `json:"targetNodeId"`
					Name         string `json:"name"`
				} `json:"node"`
			} `json:"riskAssessmentProcessEdge"`
		} `json:"createRiskAssessmentProcess"`
	}
	err := owner.Execute(`
		mutation($input: CreateRiskAssessmentProcessInput!) {
			createRiskAssessmentProcess(input: $input) {
				riskAssessmentProcessEdge { node { id sourceNodeId targetNodeId name } }
			}
		}
	`, map[string]any{
		"input": map[string]any{
			"riskAssessmentScopeId": scopeID,
			"sourceNodeId":          src,
			"targetNodeId":          dst,
			"name":                  "User → API",
		},
	}, &result)

	require.NoError(t, err)
	assert.Equal(t, src, result.CreateRiskAssessmentProcess.RiskAssessmentProcessEdge.Node.SourceNodeID)
	assert.Equal(t, dst, result.CreateRiskAssessmentProcess.RiskAssessmentProcessEdge.Node.TargetNodeID)
}

func TestRiskAssessmentThreat_Create(t *testing.T) {
	t.Parallel()

	owner := testutil.NewClient(t, testutil.RoleOwner)
	raID := factory.CreateRiskAssessment(owner)
	scopeID := factory.CreateRiskAssessmentScope(owner, raID)
	src := factory.CreateRiskAssessmentNode(owner, scopeID)
	dst := factory.CreateRiskAssessmentNode(owner, scopeID)
	processID := factory.CreateRiskAssessmentProcess(owner, scopeID, src, dst)

	var result struct {
		CreateRiskAssessmentThreat struct {
			RiskAssessmentThreatEdge struct {
				Node struct {
					ID        string `json:"id"`
					ProcessID string `json:"processId"`
					Category  string `json:"category"`
				} `json:"node"`
			} `json:"riskAssessmentThreatEdge"`
		} `json:"createRiskAssessmentThreat"`
	}
	err := owner.Execute(`
		mutation($input: CreateRiskAssessmentThreatInput!) {
			createRiskAssessmentThreat(input: $input) {
				riskAssessmentThreatEdge { node { id processId category } }
			}
		}
	`, map[string]any{
		"input": map[string]any{
			"riskAssessmentScopeId": scopeID,
			"processId":             processID,
			"name":                  "SQL injection",
			"category":              "Confidentiality",
		},
	}, &result)

	require.NoError(t, err)
	assert.Equal(t, processID, result.CreateRiskAssessmentThreat.RiskAssessmentThreatEdge.Node.ProcessID)
	assert.Equal(t, "Confidentiality", result.CreateRiskAssessmentThreat.RiskAssessmentThreatEdge.Node.Category)
}

func TestRiskScenario_Create(t *testing.T) {
	t.Parallel()

	owner := testutil.NewClient(t, testutil.RoleOwner)

	raID := factory.CreateRiskAssessment(owner)
	scopeID := factory.CreateRiskAssessmentScope(owner, raID)
	src := factory.CreateRiskAssessmentNode(owner, scopeID)
	dst := factory.CreateRiskAssessmentNode(owner, scopeID)
	processID := factory.CreateRiskAssessmentProcess(owner, scopeID, src, dst)
	threatID := factory.CreateRiskAssessmentThreat(owner, scopeID, processID)
	riskID := factory.CreateRisk(owner)

	var result struct {
		CreateRiskScenario struct {
			RiskScenarioEdge struct {
				Node struct {
					ID       string `json:"id"`
					ThreatID string `json:"threatId"`
					RiskID   string `json:"riskId"`
					Name     string `json:"name"`
				} `json:"node"`
			} `json:"riskScenarioEdge"`
		} `json:"createRiskScenario"`
	}
	err := owner.Execute(`
		mutation($input: CreateRiskScenarioInput!) {
			createRiskScenario(input: $input) {
				riskScenarioEdge { node { id threatId riskId name } }
			}
		}
	`, map[string]any{
		"input": map[string]any{
			"threatId": threatID,
			"riskId":   riskID,
			"name":     "SQL injection impacts data breach risk",
		},
	}, &result)

	require.NoError(t, err)
	assert.Equal(t, threatID, result.CreateRiskScenario.RiskScenarioEdge.Node.ThreatID)
	assert.Equal(t, riskID, result.CreateRiskScenario.RiskScenarioEdge.Node.RiskID)
}

func TestRiskScenario_ListViaRisk(t *testing.T) {
	t.Parallel()

	owner := testutil.NewClient(t, testutil.RoleOwner)

	raID := factory.CreateRiskAssessment(owner)
	scopeID := factory.CreateRiskAssessmentScope(owner, raID)
	src := factory.CreateRiskAssessmentNode(owner, scopeID)
	dst := factory.CreateRiskAssessmentNode(owner, scopeID)
	processID := factory.CreateRiskAssessmentProcess(owner, scopeID, src, dst)
	threat1 := factory.CreateRiskAssessmentThreat(owner, scopeID, processID, factory.Attrs{"name": "T1"})
	threat2 := factory.CreateRiskAssessmentThreat(owner, scopeID, processID, factory.Attrs{"name": "T2"})
	riskID := factory.CreateRisk(owner)

	factory.CreateRiskScenario(owner, threat1, riskID, factory.Attrs{"name": "S1"})
	factory.CreateRiskScenario(owner, threat2, riskID, factory.Attrs{"name": "S2"})

	var result struct {
		Node struct {
			Scenarios struct {
				TotalCount int `json:"totalCount"`
				Edges      []struct {
					Node struct {
						ID   string `json:"id"`
						Name string `json:"name"`
					} `json:"node"`
				} `json:"edges"`
			} `json:"scenarios"`
		} `json:"node"`
	}
	err := owner.Execute(`
		query($id: ID!) {
			node(id: $id) {
				... on Risk {
					scenarios(first: 10) {
						totalCount
						edges { node { id name } }
					}
				}
			}
		}
	`, map[string]any{"id": riskID}, &result)

	require.NoError(t, err)
	assert.Equal(t, 2, result.Node.Scenarios.TotalCount)
	assert.Len(t, result.Node.Scenarios.Edges, 2)
}

func TestRiskAssessment_RBAC(t *testing.T) {
	t.Parallel()

	t.Run("viewer cannot create", func(t *testing.T) {
		t.Parallel()
		owner := testutil.NewClient(t, testutil.RoleOwner)
		viewer := testutil.NewClientInOrg(t, testutil.RoleViewer, owner)

		_, err := viewer.Do(`
			mutation($input: CreateRiskAssessmentInput!) {
				createRiskAssessment(input: $input) { riskAssessmentEdge { node { id } } }
			}
		`, map[string]any{
			"input": map[string]any{
				"organizationId": viewer.GetOrganizationID().String(),
				"name":           "test",
			},
		})
		testutil.RequireForbiddenError(t, err, "viewer cannot create risk assessment")
	})

	t.Run("viewer can read", func(t *testing.T) {
		t.Parallel()
		owner := testutil.NewClient(t, testutil.RoleOwner)
		viewer := testutil.NewClientInOrg(t, testutil.RoleViewer, owner)
		raID := factory.CreateRiskAssessment(owner, factory.Attrs{"name": "Visible"})

		var result struct {
			Node struct {
				ID   string `json:"id"`
				Name string `json:"name"`
			} `json:"node"`
		}
		err := viewer.Execute(`
			query($id: ID!) { node(id: $id) { ... on RiskAssessment { id name } } }
		`, map[string]any{"id": raID}, &result)
		require.NoError(t, err)
		assert.Equal(t, "Visible", result.Node.Name)
	})
}

func TestRiskAssessment_TenantIsolation(t *testing.T) {
	t.Parallel()

	owner1 := testutil.NewClient(t, testutil.RoleOwner)
	owner2 := testutil.NewClient(t, testutil.RoleOwner)
	raID := factory.CreateRiskAssessment(owner1)

	var result struct {
		Node *struct {
			ID string `json:"id"`
		} `json:"node"`
	}
	err := owner2.Execute(`
		query($id: ID!) { node(id: $id) { ... on RiskAssessment { id } } }
	`, map[string]any{"id": raID}, &result)
	testutil.AssertNodeNotAccessible(t, err, result.Node == nil, "RiskAssessment")
}
