#!/usr/bin/python
import csv
import json


# Define the data to read in and the columns in the CSV files to link
# the nodes based on
DATA_FILES = [
    # {
    #     'path': 'Data_Elements_Clean.csv',
    #     'links': ['Goal1', 'Goal2', 'Goal3']
    # },
    {
        'path': 'Interview_Data_Clean_Consolidated_DM_Only.csv',
        'links': ['GOAL']
    }
]


def convert_data(datafile):
    data = {'nodes': [], 'links': []}

    # Extract each row as a node, adding a unique id to each
    node_id = 0
    with open(datafile['path'], 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            row['id'] = node_id
            node_id += 1
            row['group'] = 0
            data['nodes'].append(row)

    # Create "supernodes" for each value present in columns
    # specified by 'links'
    supernodes = []
    supernode_indices = {}
    for node in data['nodes']:
        for value in [node[link] for link in datafile['links']]:
            if value is '':
                continue

            # Lazily add previously unseen supernodes
            if value not in supernode_indices:
                # Add node to node list that will actually get displayed
                index = len(supernodes) + len(data['nodes'])
                supernodes.append({
                    'id': index,
                    'Element': value,
                    'group': 1
                })

                # Keep track of which supernodes we've already added and their
                # location in the node list. We use this to create the links
                supernode_indices[value] = index

            # Create link for this node and value
            data['links'].append({
                'source': supernode_indices[value],
                'target': node['id'],
                'value': 0.01
            })

    # Finally add supernodes into node list
    # Do this at the end to avoid processing supernodes as nodes
    data['nodes'] += supernodes
    return data


def standalone():
    for datafile in DATA_FILES:
        print 'Processing', datafile['path']
        data = convert_data(datafile)
        with open(datafile['path'].replace('csv', 'json'), 'w') as f:
            json.dump(data, f)


if __name__ == '__main__':
    standalone()
